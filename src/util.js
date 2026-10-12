const crypto = require('crypto');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { data } = require('./db');

const env = process.env;
const BOT = '[TCL] Live Transfer';
const FED = '[TCL] TRS CIS League';
const COLORS = { green: 0x9b5de5, red: 0xd9468f, blue: 0x5b8cff };

const NOT_FOUND = '❌ User not found on the server.';
const ROLE_ERR = '❌ Can not change roles. My role must be above the team roles.';
const DM_CLOSED = '❌ Can not DM this player (DMs are closed).';
const DM_WARN = '\n⚠️ Could not send a DM.';

const embed = (client, color, title, description) =>
  new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: BOT, iconURL: client.user.displayAvatarURL() })
    .setTitle(title ?? null)
    .setDescription(description ?? null);

const footer = (e, text) => e.setFooter({ text: `${BOT} | ${text}` }).setTimestamp();

const slash = (name, description, admin = false) => {
  const b = new SlashCommandBuilder().setName(name).setDescription(description);
  b.setDMPermission(false);
  return admin ? b.setDefaultMemberPermissions(PermissionFlagsBits.Administrator) : b;
};

const opt = {
  team: (o) => o.setName('team').setDescription('Team role').setRequired(true),
  user: (o) => o.setName('user').setDescription('Player').setRequired(true),
};

const isAdmin = (i) => i.memberPermissions.has(PermissionFlagsBits.Administrator);
const seasons = (n) => String(n).replace('.', ',');
const money = (n) => (n ? `$${n.toLocaleString('en-US')}` : 'Free');
const mention = (id) => `<@${id}> (${id})`;

// manager / assistant -> their team
function staffOf(userId) {
  for (const [roleId, team] of Object.entries(data.teams)) {
    if (team.manager === userId) return { roleId, team, rank: 'manager' };
    if (team.assistants.includes(userId)) return { roleId, team, rank: 'assistant' };
  }
  return null;
}

const teamRoleOf = (member) => Object.keys(data.teams).find((id) => member.roles.cache.has(id));

// "emoji + team name"
function label(guild, roleId) {
  const emoji = data.teams[roleId]?.emoji ?? '';
  return `${emoji} ${guild.roles.cache.get(roleId)?.name ?? 'Unknown team'}`.trim();
}

function emojiUrl(emoji) {
  const m = /^<(a?):\w+:(\d+)>$/.exec(emoji ?? '');
  return m && `https://cdn.discordapp.com/emojis/${m[2]}.${m[1] ? 'gif' : 'png'}`;
}

const hasPending = (userId) => Object.values(data.pending).some((p) => p.userId === userId);
const dm = (user, payload) => user.send(payload).catch(() => null);
const newId = () => crypto.randomBytes(5).toString('hex');

async function postLog(client, payload) {
  const channel = await client.channels.fetch(env.CONTRACTS_CHANNEL_ID).catch(() => null);
  await channel?.send(payload).catch(() => {});
}

async function setRoles(member, add = [], remove = []) {
  try {
    if (remove.length) await member.roles.remove(remove);
    if (add.length) await member.roles.add(add);
    return true;
  } catch {
    return false;
  }
}

const buttons = (id) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`req:acc:${id}`).setLabel('Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`req:dec:${id}`).setLabel('Decline').setStyle(ButtonStyle.Danger),
  );

module.exports = {
  env, FED, COLORS, NOT_FOUND, ROLE_ERR, DM_CLOSED, DM_WARN,
  embed, footer, slash, opt, isAdmin, seasons, money, mention,
  staffOf, teamRoleOf, label, emojiUrl, hasPending, dm, newId, postLog, setRoles, buttons,
};
