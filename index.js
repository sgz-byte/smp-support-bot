const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
  Collection
} = require("discord.js");

const transcripts = require("discord-html-transcripts");
const express = require("express");
const fs = require("fs");

/* ================= KEEP RENDER ALIVE ================= */

const app = express();
app.get("/", (req, res) => res.send("Alive"));
app.listen(process.env.PORT || 3000);

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CATEGORY_ID = "1454818204638515310";
const PANEL_CHANNEL_ID = "1454444771626975305";
const LOG_CHANNEL_ID = "1471050244442558589";

const LEVELS_CHANNEL_ID = "1471278932581023968";
const COMMANDS_CHANNEL_ID = "1471279015959597127";

const STAFF_ROLE_1 = "1454488584869646368";
const STAFF_ROLE_2 = "1454449956139302945";

const BANNER_IMAGE = "https://cdn.discordapp.com/attachments/1457429025227280577/1471197949559181603/EC5EE755-447D-41DA-B199-868DE5A1EB65.png";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openTickets = new Collection();
let ticketCounter = 1;

/* ================= SLASH COMMAND ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription("Send the ticket panel")
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

client.once("ready", async () => {
  console.log(`${client.user.tag} online`);
  await registerCommands();
});

/* ================= TICKET FORMS ================= */

const forms = {
  ban: ["Username", "Platform", "Ban ID", "Why unban?"],
  report: ["Player IGN", "Proof Link", "What happened?"],
  media: ["Username", "Videos", "Requirements met?"],
  discord: ["Reported User", "Proof", "What happened?"],
  bug: ["Bug Name", "Video", "Describe bug"],
  purchase: ["Username", "What bought?", "Issue?"],
  connection: ["Username", "Error", "Describe issue"]
};

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {

      if (interaction.channel.id !== PANEL_CHANNEL_ID)
        return interaction.reply({ content: "Use this in the panel channel.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("🎟 GraveSMP Support")
        .setDescription("Select a ticket type below.")
        .setColor("#8B0000")
        .setImage(BANNER_IMAGE);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("media").setLabel("Media App").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("bug").setLabel("Bug Report").setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  if (interaction.isButton() && forms[interaction.customId]) {

    if (openTickets.has(interaction.user.id))
      return interaction.reply({ content: "You already have a ticket.", ephemeral: true });

    const modal = new ModalBuilder()
      .setCustomId(`modal_${interaction.customId}`)
      .setTitle("Ticket Form");

    forms[interaction.customId].forEach((q, i) => {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`q${i}`)
            .setLabel(q)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );
    });

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit()) {

    const type = interaction.customId.split("_")[1];
    const number = String(ticketCounter++).padStart(4, "0");

    const channel = await interaction.guild.channels.create({
      name: `${type}-${number}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      topic: interaction.user.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_1, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: STAFF_ROLE_2, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    openTickets.set(interaction.user.id, channel.id);

    const embed = new EmbedBuilder()
      .setTitle(`Ticket #${number}`)
      .setColor("#8B0000");

    forms[type].forEach((q, i) => {
      embed.addFields({ name: q, value: interaction.fields.getTextInputValue(`q${i}`) });
    });

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `Welcome ${interaction.user}\n<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`,
      embeds: [embed],
      components: [controls]
    });

    return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  }

  if (interaction.customId === "close") {
    const transcript = await transcripts.createTranscript(interaction.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    await logChannel.send({ files: [transcript] });

    openTickets.delete(interaction.channel.topic);
    return interaction.channel.delete();
  }
});

/* ================= LEVEL SYSTEM ================= */

const LEVELS_FILE = "./levels.json";
let levels = fs.existsSync(LEVELS_FILE)
  ? JSON.parse(fs.readFileSync(LEVELS_FILE))
  : {};

function saveLevels() {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
}

function xpNeeded(level) {
  return 100 * (level + 1);
}

/* PUT YOUR REAL ROLE IDS BELOW */

const rankRoles = [
  { level: 1, roleId: "1471268892050591999" },
  { level: 3, roleId: "1471269005502316714" },
  { level: 5, roleId: "1471269098993221665" },
  { level: 10, roleId: "1471269180899594360" },
  { level: 20, roleId: "1471269292380262586" },
  { level: 30, roleId: "1471269374794010697" },
  { level: 40, roleId: "1471269477642404040" },
  { level: 50, roleId: "1471269566289281054" },
  { level: 70, roleId: "1471269661554512026" },
  { level: 90, roleId: "1471269746132389909" }
];

const xpCooldown = new Set();

client.on("messageCreate", async message => {

  if (message.author.bot) return;

  /* COMMAND CHANNEL */
  if (message.channel.id === COMMANDS_CHANNEL_ID) {

    if (message.content === "!rank") {
      const data = levels[message.author.id];
      if (!data) return message.reply("No XP yet.");

      return message.reply(
        `🪦 Level: ${data.level}\nXP: ${data.xp}/${xpNeeded(data.level)}`
      );
    }

    if (message.content === "!leaderboard") {
      const sorted = Object.entries(levels)
        .sort((a, b) => b[1].level - a[1].level)
        .slice(0, 10);

      let text = "💀 Grave Leaderboard 💀\n\n";

      for (let i = 0; i < sorted.length; i++) {
        const user = await client.users.fetch(sorted[i][0]);
        text += `${i + 1}. ${user.username} — Level ${sorted[i][1].level}\n`;
      }

      return message.channel.send(text);
    }

    return;
  }

  /* XP SYSTEM */

  if (message.content.length < 5) return;
  if (xpCooldown.has(message.author.id)) return;

  xpCooldown.add(message.author.id);
  setTimeout(() => xpCooldown.delete(message.author.id), 60000);

  if (!levels[message.author.id])
    levels[message.author.id] = { xp: 0, level: 0 };

  levels[message.author.id].xp += 10;

  const needed = xpNeeded(levels[message.author.id].level);

  if (levels[message.author.id].xp >= needed) {
    levels[message.author.id].level++;

    const levelChannel = await client.channels.fetch(LEVELS_CHANNEL_ID);
    levelChannel.send(
      `🎉 ${message.author} reached Level ${levels[message.author.id].level}!`
    );

    for (const rank of rankRoles) {
      if (levels[message.author.id].level === rank.level) {
        const role = message.guild.roles.cache.get(rank.roleId);
        if (role) await message.member.roles.add(role);
      }
    }
  }

  saveLevels();
});

client.login(TOKEN);
