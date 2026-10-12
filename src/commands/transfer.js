const U = require('../util');
const { request } = require('../staff');

module.exports = {
  staff: true,
  data: U.slash('transfer', 'Transfer a player to your team')
    .addUserOption(U.opt.user)
    .addIntegerOption((o) => o.setName('fee').setDescription('Transfer fee').setMinValue(0)),

  async execute(i, staff) {
    const user = i.options.getUser('user');
    const fee = i.options.getInteger('fee') ?? 0;
    const member = await i.guild.members.fetch(user.id).catch(() => null);
    if (!member) return i.editReply(U.NOT_FOUND);

    const fromRole = U.teamRoleOf(member);
    if (!fromRole) return i.editReply('❌ This player has no team. Use /offer instead.');
    if (fromRole === staff.roleId) return i.editReply('❌ This player is already in your team.');
    if (U.staffOf(user.id)) return i.editReply('❌ You can not transfer team staff.');
    if (U.hasPending(user.id)) return i.editReply('❌ This player already has a pending request.');

    const from = U.label(i.guild, fromRole);
    const to = U.label(i.guild, staff.roleId);
    const e = U.embed(
      i.client,
      U.COLORS.blue,
      'Transfer Request',
      `Do you agree to transfer to **${to}** from **${from}**?`,
    ).addFields(
      { name: 'From Team', value: from, inline: true },
      { name: 'To Team', value: to, inline: true },
      { name: 'Transfer Fee', value: U.money(fee), inline: true },
      { name: 'Requested by', value: i.member.displayName, inline: true },
    );
    U.footer(e, 'Please respond using the buttons below');

    const sent = await request(i, user, e, { type: 'transfer', fromRole, toRole: staff.roleId, fee });
    if (!sent) return i.editReply(U.DM_CLOSED);
    return i.editReply(`📨 Transfer request sent to ${user}: ${from} ➜ ${to}.`);
  },
};
