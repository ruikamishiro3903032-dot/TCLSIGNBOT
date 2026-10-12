const { data, save } = require('../db');
const U = require('../util');

module.exports = {
  data: U.slash('demand', 'Leave your club').addStringOption((o) =>
    o.setName('reason').setDescription('Reason').setMaxLength(300),
  ),

  async execute(i) {
    const roleId = U.teamRoleOf(i.member);
    if (!roleId) return i.editReply('❌ You are not in a team.');
    const team = data.teams[roleId];
    if (team.manager === i.user.id) return i.editReply('❌ Managers can not use /demand.');

    const assistant = team.assistants.includes(i.user.id);
    const remove = [roleId, assistant && U.env.ASSISTANT_ROLE_ID].filter(Boolean);
    if (!(await U.setRoles(i.member, [], remove))) return i.editReply(U.ROLE_ERR);
    if (assistant) team.assistants = team.assistants.filter((id) => id !== i.user.id);
    save();

    const tag = U.label(i.guild, roleId);
    const reason = i.options.getString('reason') ?? 'No reason provided';
    const e = U.embed(
      i.client,
      U.COLORS.red,
      'Player demand 📤',
      `**${i.member.displayName}** has left ${tag}.`,
    ).addFields(
      { name: 'Player', value: U.mention(i.user.id), inline: true },
      { name: 'Team', value: tag, inline: true },
      { name: 'Reason', value: reason },
    );
    U.footer(e, 'Demand made by player');

    const manager = team.manager && (await i.client.users.fetch(team.manager).catch(() => null));
    if (manager) await U.dm(manager, { embeds: [e] });
    await U.postLog(i.client, { embeds: [e] });
    return i.editReply(`✅ You have left ${tag}.`);
  },
};
