const { save } = require('../db');
const U = require('../util');

module.exports = {
  staff: 'manager',
  data: U.slash('assistant_appoint', 'Appoint an assistant manager').addUserOption(U.opt.user),

  async execute(i, staff) {
    const user = i.options.getUser('user');
    if (user.bot || U.staffOf(user.id)) return i.editReply('❌ This user can not be appointed.');

    const member = await i.guild.members.fetch(user.id).catch(() => null);
    if (!member) return i.editReply(U.NOT_FOUND);
    const current = U.teamRoleOf(member);
    if (current && current !== staff.roleId) {
      return i.editReply(`❌ This user plays for ${U.label(i.guild, current)}.`);
    }
    if (!(await U.setRoles(member, [staff.roleId, U.env.ASSISTANT_ROLE_ID]))) {
      return i.editReply(U.ROLE_ERR);
    }

    staff.team.assistants.push(user.id);
    save();

    const tag = U.label(i.guild, staff.roleId);
    const text = `You have been appointed as **Assistant Manager** of ${tag} by ${i.user}.`;
    const sent = await U.dm(user, {
      embeds: [U.embed(i.client, U.COLORS.blue, 'Assistant Manager Appointed', text)],
    });
    return i.editReply(`✅ ${user} is now an assistant manager of ${tag}.${sent ? '' : U.DM_WARN}`);
  },
};
