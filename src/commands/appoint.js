const { slash, opt } = require('../util');
const { setManager } = require('../staff');

module.exports = {
  admin: true,
  data: slash('appoint', 'Appoint a team manager', true)
    .addRoleOption(opt.team)
    .addUserOption(opt.user),
  execute: (i) => setManager(i, i.options.getRole('team'), i.options.getUser('user')),
};
