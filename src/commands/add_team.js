const { data, save } = require('../db');
const { slash, embed, COLORS } = require('../util');

const EMOJI = /^<a?:\w+:\d+>$|\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

module.exports = {
  admin: true,
  data: slash('add_team', 'Add a team', true)
    .addRoleOption((o) => o.setName('role').setDescription('Team role').setRequired(true))
    .addStringOption((o) => o.setName('emoji').setDescription('Team emoji').setRequired(true)),

  async execute(i) {
    const role = i.options.getRole('role');
    const emoji = i.options.getString('emoji').trim();
    if (!EMOJI.test(emoji)) return i.editReply('❌ Invalid emoji.');

    const old = data.teams[role.id];
    data.teams[role.id] = { emoji, manager: old?.manager ?? null, assistants: old?.assistants ?? [] };
    save();

    const text = `${old ? 'Updated' : 'Added'}: ${emoji} ${role}`;
    return i.editReply({ embeds: [embed(i.client, COLORS.green, null, text)] });
  },
};
