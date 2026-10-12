const { save } = require('../db');
const U = require('../util');

module.exports = {
  staff: true,
  data: U.slash('release', 'Release a player')
    .addUserOption(U.opt.user)
    .addStringOption((o) =>
      o.setName('reason').setDescription('Reason').setRequired(true).setMaxLength(300),
    ),

  async execute(i, staff) {
    const user = i.options.getUser('user');
    const reason = i.options.getString('reason');
    const member = await i.guild.members.fetch(user.id).catch(() => null);
    if (!member) return i.editReply(U.NOT_FOUND);
    if (U.teamRoleOf(member) !== staff.roleId) {
      return i.editReply('❌ This user is not in your team.');
    }
    if (staff.team.manager === user.id) return i.editReply('❌ You can not release the manager.');

    const assistant = staff.team.assistants.includes(user.id);
    if (assistant && staff.rank !== 'manager') {
      return i.editReply('❌ Only the manager can release an assistant.');
    }

    const remove = [staff.roleId, assistant && U.env.ASSISTANT_ROLE_ID].filter(Boolean);
    if (!(await U.setRoles(member, [], remove))) return i.editReply(U.ROLE_ERR);
    if (assistant) staff.team.assistants = staff.team.assistants.filter((id) => id !== user.id);
    save();

    const team = U.label(i.guild, staff.roleId);
    const by = `Release made by ${i.member.displayName}.`;
    const log = U.embed(i.client, U.COLORS.red, 'Player released ❌').addFields(
      { name: 'Player', value: U.mention(user.id), inline: true },
      { name: 'Manager', value: U.mention(i.user.id), inline: true },
      { name: 'Team', value: team, inline: true },
      { name: 'Reason', value: reason },
    );
    await U.postLog(i.client, { embeds: [U.footer(log, by)] });

    const text = `You have been released from ${team}.`;
    const note = U.embed(i.client, U.COLORS.red, 'You have been released ❌', text).addFields({
      name: 'Reason',
      value: reason,
    });
    const sent = await U.dm(user, { embeds: [U.footer(note, by)] });
    return i.editReply(`✅ ${user} was released from ${team}.${sent ? '' : U.DM_WARN}`);
  },
};
