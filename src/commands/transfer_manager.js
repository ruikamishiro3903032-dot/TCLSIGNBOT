const { slash, opt } = require('../util');
const { setManager } = require('../staff');

module.exports = {
  admin: true,
  data: slash('transfer_manager', 'Move the manager role to another player', true)
    .addRoleOption(opt.team)
    .addUserOption(opt.user),
  execute: (i) => setManager(i, i.options.getRole('team'), i.options.getUser('user'), true),
};
