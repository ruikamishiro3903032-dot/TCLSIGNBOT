const { data, save } = require('./db');
const U = require('./util');

// sends a DM with Accept / Decline buttons and stores the pending request
async function request(i, user, e, pending) {
  const id = U.newId();
  if (!(await U.dm(user, { embeds: [e], components: [U.buttons(id)] }))) return false;
  data.pending[id] = { guildId: i.guild.id, userId: user.id, managerId: i.user.id, ...pending };
  save();
  return true;
}

// used by /appoint and /transfer_manager (move = team must already have a manager)
async function setManager(i, teamRole, user, move = false) {
  const team = data.teams[teamRole.id];
  if (!team) return i.editReply('❌ This role is not a registered team.');
  if (move && !team.manager) return i.editReply('❌ This team has no manager. Use /appoint.');
  if (team.manager === user.id) return i.editReply('❌ Already the manager of this team.');
  if (user.bot) return i.editReply('❌ You can not appoint a bot.');

  const member = await i.guild.members.fetch(user.id).catch(() => null);
  if (!member) return i.editReply(U.NOT_FOUND);
  const staff = U.staffOf(user.id);
  if (staff && staff.roleId !== teamRole.id) {
    return i.editReply(`❌ Already staff of ${U.label(i.guild, staff.roleId)}.`);
  }

  const other = U.teamRoleOf(member);
  const leave = [U.env.ASSISTANT_ROLE_ID, other !== teamRole.id && other].filter(Boolean);
  if (!(await U.setRoles(member, [teamRole.id, U.env.MANAGER_ROLE_ID], leave))) {
    return i.editReply(U.ROLE_ERR);
  }

  const oldId = team.manager;
  const old = oldId && (await i.guild.members.fetch(oldId).catch(() => null));
  if (old) await U.setRoles(old, [], [U.env.MANAGER_ROLE_ID]);
  team.assistants = team.assistants.filter((id) => id !== user.id);
  team.manager = user.id;
  save();

  const tag = U.label(i.guild, teamRole.id);
  const oldUser = oldId && (await i.client.users.fetch(oldId).catch(() => null));
  if (oldUser) {
    const e = U.embed(i.client, U.COLORS.red, 'Manager role removed', `You are no longer the **Manager** of ${tag}.`);
    await U.dm(oldUser, { embeds: [e] });
  }
  const e = U.embed(i.client, U.COLORS.blue, 'Manager Appointed', `You have been appointed as **Manager** of ${tag} in **${U.FED}**.`);
  const sent = await U.dm(user, { embeds: [e] });
  return i.editReply(`✅ ${user} is now the manager of ${tag}.${sent ? '' : U.DM_WARN}`);
}

module.exports = { request, setManager };
