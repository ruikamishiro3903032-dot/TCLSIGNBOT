const { data, save } = require('../db');
const U = require('../util');

module.exports = {
  admin: true,
  data: U.slash('disband_undo', 'Undo a disband', true).addRoleOption(U.opt.team),

  async execute(i) {
    const role = i.options.getRole('team');
    const team = data.teams[role.id];
    const snap = data.disbanded[role.id];
    if (!team) return i.editReply('❌ This role is not a registered team.');
    if (!snap) return i.editReply('❌ There is no disband to undo for this team.');

    let restored = 0;
    const skipped = [];

    // skips users who left, joined another team or became staff elsewhere
    const give = async (id, roles) => {
      const member = await i.guild.members.fetch(id).catch(() => null);
      const free = member && !U.teamRoleOf(member) && !U.staffOf(id);
      if (!free || !(await U.setRoles(member, roles))) return skipped.push(id) && false;
      restored++;
      return true;
    };

    if (snap.manager) {
      const ok = !team.manager && (await give(snap.manager, [role.id, U.env.MANAGER_ROLE_ID]));
      if (ok) team.manager = snap.manager;
      else if (team.manager) skipped.push(snap.manager);
    }
    for (const id of snap.assistants) {
      if (await give(id, [role.id, U.env.ASSISTANT_ROLE_ID])) team.assistants.push(id);
    }
    for (const id of snap.players) await give(id, [role.id]);

    const total = (snap.manager ? 1 : 0) + snap.assistants.length + snap.players.length;
    delete data.disbanded[role.id];
    save();

    const tag = U.label(i.guild, role.id);
    const log = U.embed(i.client, U.COLORS.green, 'Disband reverted ✅').addFields(
      { name: 'Team', value: tag, inline: true },
      { name: 'Restored', value: `${restored} / ${total}`, inline: true },
    );
    U.footer(log, `Undo made by ${i.member.displayName}.`);
    await U.postLog(i.client, { embeds: [log] });

    const warn = skipped.length ? `\n⚠️ Skipped: ${skipped.map((id) => `<@${id}>`).join(' ')}` : '';
    return i.editReply(`✅ ${tag} restored: ${restored} / ${total}.${warn}`);
  },
};
