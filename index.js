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
  Collection,
  StringSelectMenuBuilder
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
const ROLES_CHANNEL_ID = "1471287988448268411";

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

/* ================= SLASH COMMAND REGISTRATION ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription("Send the ticket panel"),

    new SlashCommandBuilder()
      .setName("roles")
      .setDescription("Send the self role panel"),

    new SlashCommandBuilder()
      .setName("rank")
      .setDescription("Check your level and XP"),

    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("View the top 10 leaderboard")
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

/* ================= LEVEL SYSTEM ================= */

const LEVELS_FILE = "./levels.json";

let levels = fs.existsSync(LEVELS_FILE)
  ? JSON.parse(fs.readFileSync(LEVELS_FILE))
  : {};

function saveLevels() {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
}

function xpNeeded(level) {
  return 200 * (level + 1);
}

const rankRoles = [
  { level: 1, roleId: "1471268892050591999", name: "🩸 Reaper" },
  { level: 3, roleId: "1471269005502316714", name: "☠ Ghoul" },
  { level: 5, roleId: "1471269098993221665", name: "🪦 Bloodbound" },
  { level: 10, roleId: "1471269180899594360", name: "😈 Demon" },
  { level: 20, roleId: "1471269292380262586", name: "🔥 Hellspawn" },
  { level: 30, roleId: "1471269374794010697", name: "🧟 Warlord" },
  { level: 40, roleId: "1471269477642404040", name: "⚰ Gravekeeper" },
  { level: 50, roleId: "1471269566289281054", name: "🕯 Deathbringer" },
  { level: 70, roleId: "1471269661554512026", name: "👁 Shadowlord" },
  { level: 90, roleId: "1471269746132389909", name: "💀 Grave King" }
];

const xpCooldown = new Set();
const lastMessage = new Map();

function calculateXP(message) {
  const length = message.content.length;
  if (length < 6) return 0;
  let xp = Math.floor(length / 10);
  if (xp > 25) xp = 25;
  return xp;
}

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    /* PANEL */
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

    /* ROLES */
    if (interaction.commandName === "roles") {

      if (interaction.channel.id !== ROLES_CHANNEL_ID)
        return interaction.reply({ content: "Use this in the roles channel.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("🎭 Choose Your Roles")
        .setDescription(
          "• Region, Platform & Age = 1 choice\n" +
          "• Ping roles = multiple allowed"
        );

      const regionMenu = new StringSelectMenuBuilder()
        .setCustomId("region_select")
        .setPlaceholder("Select Your Region")
        .addOptions([
          { label: "Europe", value: "1471295797260976249" },
          { label: "North America", value: "1471295844836970646" },
          { label: "South America", value: "1471295885278314710" },
          { label: "Asia", value: "1471295939590225970" },
          { label: "Africa", value: "1471295982376325257" },
          { label: "Oceania", value: "1471296039012139222" }
        ]);

      const platformMenu = new StringSelectMenuBuilder()
        .setCustomId("platform_select")
        .setPlaceholder("Select Your Platform")
        .addOptions([
          { label: "PC", value: "1471288525314854912" },
          { label: "Xbox", value: "1471288589450084514" },
          { label: "PlayStation", value: "1471288632135651562" },
          { label: "Mobile", value: "1471288673126449315" }
        ]);

      const ageMenu = new StringSelectMenuBuilder()
        .setCustomId("age_select")
        .setPlaceholder("Select Your Age Group")
        .addOptions([
          { label: "-13", value: "1471296097874870418" },
          { label: "13-14", value: "1471296149242515568" },
          { label: "15-17", value: "1471296183908434061" },
          { label: "18-20", value: "1471296230620663950" },
          { label: "21-24", value: "1471296282038505737" },
          { label: "25+", value: "1471296335746699336" }
        ]);

      const pingMenu = new StringSelectMenuBuilder()
        .setCustomId("ping_select")
        .setPlaceholder("Select Ping Roles")
        .setMinValues(0)
        .setMaxValues(5)
        .addOptions([
          { label: "News", value: "1471296388104065237" },
          { label: "Uploads", value: "1471296438909669549" },
          { label: "Events", value: "1471296477581021336" },
          { label: "Polls", value: "1471296524255363135" },
          { label: "Updates", value: "1471296570271072266" }
        ]);

      return interaction.reply({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(regionMenu),
          new ActionRowBuilder().addComponents(platformMenu),
          new ActionRowBuilder().addComponents(ageMenu),
          new ActionRowBuilder().addComponents(pingMenu)
        ]
      });
    }

    /* RANK */
    if (interaction.commandName === "rank") {

      const data = levels[interaction.user.id];

      if (!data)
        return interaction.reply({ content: "You have no XP yet.", ephemeral: true });

      return interaction.reply({
        content: `Level: ${data.level} | XP: ${data.xp}/${xpNeeded(data.level)}`,
        ephemeral: true
      });
    }

    /* LEADERBOARD */
    if (interaction.commandName === "leaderboard") {

      const entries = Object.entries(levels);

      if (!entries.length)
        return interaction.reply({ content: "No leaderboard data yet.", ephemeral: true });

      const sorted = entries
        .sort((a, b) =>
          b[1].level - a[1].level ||
          b[1].xp - a[1].xp
        )
        .slice(0, 10);

      let desc = "";

      for (let i = 0; i < sorted.length; i++) {
        desc += `**${i + 1}.** <@${sorted[i][0]}> — Level ${sorted[i][1].level}\n`;
      }

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("🏆 Grave Leaderboard")
        .setDescription(desc);

      return interaction.reply({ embeds: [embed] });
    }
  }
});

/* ================= MESSAGE XP TRACKING ================= */

client.on("messageCreate", async message => {

  if (message.author.bot) return;

  if (/^\p{Emoji}+$/u.test(message.content)) return;
  if (lastMessage.get(message.author.id) === message.content) return;

  lastMessage.set(message.author.id, message.content);

  if (xpCooldown.has(message.author.id)) return;

  xpCooldown.add(message.author.id);
  setTimeout(() => xpCooldown.delete(message.author.id), 60000);

  const xpGain = calculateXP(message);
  if (xpGain <= 0) return;

  if (!levels[message.author.id])
    levels[message.author.id] = { xp: 0, level: 0 };

  levels[message.author.id].xp += xpGain;

  const needed = xpNeeded(levels[message.author.id].level);

  if (levels[message.author.id].xp >= needed) {

    levels[message.author.id].level++;
    levels[message.author.id].xp = 0;

    const newLevel = levels[message.author.id].level;
    const levelChannel = await client.channels.fetch(LEVELS_CHANNEL_ID);

    let unlockedRank = null;

    for (const rank of rankRoles) {
      if (newLevel === rank.level) {
        const role = message.guild.roles.cache.get(rank.roleId);
        if (role) {
          await message.member.roles.add(role);
          unlockedRank = rank.name;
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setTitle("💀 A Soul Has Risen")
      .setDescription(
        `${message.author} reached **Level ${newLevel}**` +
        (unlockedRank ? `\nUnlocked: **${unlockedRank}**` : "")
      );

    levelChannel.send({ embeds: [embed] });
  }

  saveLevels();
});

client.login(TOKEN);
