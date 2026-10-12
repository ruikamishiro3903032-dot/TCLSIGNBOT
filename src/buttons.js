const { data, save } = require('./db');
const U = require('./util');

// Accept / Decline buttons in the player's DM (offer + transfer)
module.exports = async (i) => {
  const [ns, action, id] = i.customId.split(':');
  if (ns !== 'req') return;

  const p = data.pending[id];
  if (!p) return i.update({ components: [] }).catch(() => {});
  if (i.user.id !== p.userId) return i.reply({ content: 'This request is not for you.', flags: 64 });

  delete data.pending[id];
  save();
  await i.update({ components: [] });

  const { client } = i;
  const guild = client.guilds.cache.get(p.guildId);
  const member = await guild.members.fetch(p.userId).catch(() => null);
  const manager = await client.users.fetch(p.managerId).catch(() => null);
  const name = member?.displayName ?? i.user.username;
  const by = manager?.username ?? 'manager';
  const to = U.label(guild, p.toRole);
  const from = p.fromRole && U.label(guild, p.fromRole);
  const offer = p.type === 'offer';
  const yes = action === 'acc';

  // [player title, player text, manager title, manager text]
  const texts = offer
    ? {
        yes: [
          'You have accepted the contract!',
          `${name}, you have signed to ${to} managed by ${by}`,
          'Contract accepted ✅',
          `**${name}** accepted your contract offer for ${to} (${p.role}).`,
        ],
        no: [
          'You have declined the contract!',
          `${name}, you have declined the contract from ${to} managed by ${by}`,
          'Contract declined ❌',
          `**${name}** declined your contract offer for ${to}.`,
        ],
      }
    : {
        yes: [
          'You have accepted the transfer!',
          `${name}, you have transferred from ${from} to ${to}`,
          'Transfer accepted ✅',
          `**${name}** joined ${to} from ${from}.`,
        ],
        no: [
          'You have declined the transfer!',
          `${name}, you have declined the transfer from ${from} to ${to}`,
          'Transfer declined ❌',
          `**${name}** declined the transfer from ${from} to ${to}.`,
        ],
      };

  if (yes) {
    const eligible = offer ? !U.teamRoleOf(member) : member?.roles.cache.has(p.fromRole);
    const done = member && eligible && (await U.setRoles(member, [p.toRole], offer ? [] : [p.fromRole]));
    if (!done) {
      const text = '❌ Request failed: you are not eligible or I can not change your roles.';
      await i.followUp({ embeds: [U.embed(client, U.COLORS.red, null, text)] });
      if (manager) await U.dm(manager, { embeds: [U.embed(client, U.COLORS.red, null, `❌ ${name}: request failed.`)] });
      return;
    }
  }

  const [title, text, mTitle, mText] = texts[yes ? 'yes' : 'no'];
  const color = yes ? U.COLORS.green : U.COLORS.red;
  await i.followUp({ embeds: [U.embed(client, color, U.FED, `**${title}**\n${text}`)] });
  if (manager) await U.dm(manager, { embeds: [U.embed(client, color, mTitle, mText)] });
  if (!yes) return;

  if (offer) {
    const log = U.embed(client, color, 'Player signed ✅').addFields(
      { name: 'Player', value: U.mention(p.userId), inline: true },
      { name: 'Manager', value: U.mention(p.managerId), inline: true },
      { name: 'Team', value: to, inline: true },
      { name: 'Role', value: p.role },
    );
    return U.postLog(client, { embeds: [U.footer(log, `Signed by ${by}.`)] });
  }

  // tell the old manager
  const oldId = data.teams[p.fromRole]?.manager;
  const old = oldId && oldId !== p.managerId && (await client.users.fetch(oldId).catch(() => null));
  if (old) {
    const e = U.embed(client, U.COLORS.blue, 'Player transferred', `**${name}** left ${from} and joined ${to}.`);
    await U.dm(old, { embeds: [e] });
  }

  const log = U.embed(client, color, 'Player Transfer ✅').addFields(
    { name: 'Player', value: U.mention(p.userId) },
    { name: 'From Team', value: from, inline: true },
    { name: 'To Team', value: to, inline: true },
    { name: 'Transfer Fee', value: U.money(p.fee) },
  );
  return U.postLog(client, { embeds: [U.footer(log, `Transfer made by ${by}.`)] });
};
