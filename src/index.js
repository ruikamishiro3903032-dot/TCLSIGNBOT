require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const handleButton = require('./buttons');
const { isAdmin, staffOf } = require('./util');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const commands = new Collection();

for (const file of fs.readdirSync(path.join(__dirname, 'commands'))) {
  const cmd = require(`./commands/${file}`);
  commands.set(cmd.data.name, cmd);
}

const deny = (i, text) => i.reply({ content: `❌ ${text}`, flags: 64 });

client.once('ready', async () => {
  const { id } = client.application;
  const { GUILD_ID, TOKEN } = process.env;
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(id, GUILD_ID)
    : Routes.applicationCommands(id);
  const flag = path.join(__dirname, '..', 'data', '.avatar');
  if (!fs.existsSync(flag)) {
    // logo as bot avatar (once)
    await client.user.setAvatar(path.join(__dirname, '..', 'logo.png')).then(() => {
      fs.mkdirSync(path.dirname(flag), { recursive: true });
      fs.writeFileSync(flag, '1');
    }).catch(() => {});
  }
  try {
    await new REST().setToken(TOKEN).put(route, { body: commands.map((c) => c.data.toJSON()) });
    console.log(`${client.user.tag} online, ${commands.size} commands registered`);
  } catch (err) {
    console.error('Command registration failed:', err);
  }
});

client.on('interactionCreate', async (i) => {
  try {
    if (i.isButton()) return await handleButton(i);
    if (!i.isChatInputCommand()) return;

    const cmd = commands.get(i.commandName);
    const staff = staffOf(i.user.id);
    if (cmd.admin && !isAdmin(i)) return deny(i, 'Admins only.');
    if (cmd.staff && !staff) return deny(i, 'Managers and assistant managers only.');
    if (cmd.staff === 'manager' && staff.rank !== 'manager') return deny(i, 'Managers only.');

    await i.deferReply(cmd.public ? {} : { flags: 64 });
    await cmd.execute(i, staff);
  } catch (err) {
    console.error(err);
    const msg = '❌ Something went wrong.';
    (i.deferred || i.replied ? i.editReply({ content: msg }) : i.reply({ content: msg, flags: 64 }))
      .catch(() => {});
  }
});

client.login(process.env.TOKEN);
