const { data } = require('../db');
const U = require('../util');

const cut = (lines, max = 1000) => {
  let out = '';
  for (const line of lines) {
    if (out.length + line.length + 1 > max) return `${out}…`;
    out += `${line}\n`;
  }
  return out.trim() || '—';
};

module.exports = {
  public: true,
  data: U.slash('roster', 'Show a team roster').addRoleOption((o) =>
    o.setName('team').setDescription('Team role'),
  ),

  async execute(i) {
    await i.guild.members.fetch();
    const roleId =
      i.options.getRole('team')?.id ?? U.staffOf(i.user.id)?.roleId ?? U.teamRoleOf(i.member);
    const team = data.teams[roleId];
    const role = i.guild.roles.cache.get(roleId);
    if (!team || !role) return i.editReply('❌ Choose a registered team.');

    const staffIds = [team.manager, ...team.assistants].filter(Boolean);
    const players = [...role.members.values()].filter((m) => !staffIds.includes(m.id));
    const list = players.map((m, n) => `\`${String(n + 1).padStart(2, '0')}\` ${m} — ${m.displayName}`);

    const e = U.embed(
      i.client,
      U.COLORS.blue,
      U.label(i.guild, roleId),
      `📋 **Roster:** ${role.members.size} (${players.length} players · ${staffIds.length} staff)`,
    ).addFields(
      {
        name: 'Management',
        value: cut([
          `**Manager:** ${team.manager ? `<@${team.manager}>` : '—'}`,
          `**Assistant Managers:** ${team.assistants.map((id) => `<@${id}>`).join(', ') || '—'}`,
        ]),
      },
      { name: `Players (${players.length})`, value: cut(list) },
    );
    const icon = U.emojiUrl(team.emoji);
    if (icon) e.setThumbnail(icon);

    return i.editReply({ embeds: [U.footer(e, 'Team roster')] });
  },
};
