const { data, save } = require('../db');
const U = require('../util');

module.exports = {
  admin: true,
  data: U.slash('disband', 'Disband a team (release everyone)', true).addRoleOption(U.opt.team),

  async execute(i) {
    const role = i.options.getRole('team');
    const team = data.teams[role.id];
    if (!team) return i.editReply('❌ This role is not a registered team.');

    await i.guild.members.fetch();
    const staffIds = [team.manager, ...team.assistants].filter(Boolean);
    const holders = [...role.members.keys()];
    const players = holders.filter((id) => !staffIds.includes(id));
    if (!holders.length && !staffIds.length) return i.editReply('❌ This team is already empty.');

    // snapshot for /disband_undo
    data.disbanded[role.id] = {
      manager: team.manager,
      assistants: [...team.assistants],
      players,
    };

    let failed = 0;
    for (const id of new Set([...holders, ...staffIds])) {
      const member = await i.guild.members.fetch(id).catch(() => null);
      if (!member) continue;
      const remove = [role.id];
      if (id === team.manager) remove.push(U.env.MANAGER_ROLE_ID);
      if (team.assistants.includes(id)) remove.push(U.env.ASSISTANT_ROLE_ID);
      if (!(await U.setRoles(member, [], remove))) failed++;
    }

    for (const [id, p] of Object.entries(data.pending)) {
      if (p.toRole === role.id || p.fromRole === role.id) delete data.pending[id];
    }
    team.manager = null;
    team.assistants = [];
    save();

    const tag = U.label(i.guild, role.id);
    const log = U.embed(i.client, U.COLORS.red, 'Team disbanded ❌').addFields(
      { name: 'Team', value: tag, inline: true },
      { name: 'Released', value: `${players.length} players · ${staffIds.length} staff`, inline: true },
    );
    U.footer(log, `Disband made by ${i.member.displayName}.`);
    await U.postLog(i.client, { embeds: [log] });

    const warn = failed ? `\n⚠️ Could not change roles for ${failed} member(s).` : '';
    return i.editReply(
      `✅ ${tag} disbanded: ${players.length} players and ${staffIds.length} staff released.${warn}\nUse /disband_undo to revert.`,
    );
  },
};
