const U = require('../util');
const { request } = require('../staff');

module.exports = {
  staff: true,
  data: U.slash('offer', 'Send a contract offer')
    .addUserOption(U.opt.user)
  .addStringOption((o) =>
  o
    .setName('role')
    .setDescription('Role')
    .setRequired(true)
    .addChoices({ name: 'Starter', value: 'Starter' }, { name: 'Sub-Player', value: 'Sub-Player' }),
),

  async execute(i, staff) {
    const user = i.options.getUser('user');
   const role = i.options.getString('role');
    const member = await i.guild.members.fetch(user.id).catch(() => null);
    if (!member || user.bot) return i.editReply(U.NOT_FOUND);
    if (U.teamRoleOf(member)) return i.editReply('❌ This player is already in a team.');
    if (U.hasPending(user.id)) return i.editReply('❌ This player already has a pending request.');

    const team = U.label(i.guild, staff.roleId);
    const e = U.embed(
      i.client,
      U.COLORS.blue,
      'Contract Received',
      `You have received a contract from ${team} in **${U.FED}**.`,
    ).addFields(
      { name: 'Contract Terms', value: `Role: ${role}`, inline: true },
      { name: 'Contract by', value: i.member.displayName, inline: true },
    );
    U.footer(e, 'Please respond using the buttons below');

    const sent = await request(i, user, e, { type: 'offer', toRole: staff.roleId, role });
    if (!sent) return i.editReply(U.DM_CLOSED);
    return i.editReply(`📨 Contract sent to ${user} for ${team} (${role}).`);
  },
};
