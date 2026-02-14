const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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

/* ================= SLASH COMMANDS ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel"),
    new SlashCommandBuilder().setName("roles").setDescription("Send role panel"),
    new SlashCommandBuilder().setName("rank").setDescription("Check your rank"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Top 10 leaderboard")
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
  return 300 + level * 100;
}

function calculateXP(message) {
  if (message.content.length < 6) return 0;
  return Math.floor(Math.random() * 10) + 5; // 5-15 XP
}

const xpCooldown = new Set();

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {

  /* ================= SLASH ================= */

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "panel") {

      if (interaction.channel.id !== PANEL_CHANNEL_ID)
        return interaction.reply({ content: "Wrong channel.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("🎟 GraveSMP Support")
        .setDescription("Choose a ticket type below.")
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

    if (interaction.commandName === "roles") {

      if (interaction.channel.id !== ROLES_CHANNEL_ID)
        return interaction.reply({ content: "Wrong channel.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("🎭 Choose Roles")
        .setColor("#8B0000")
        .setDescription("Region / Platform / Age = 1 choice\nPing roles = multiple allowed");

      const regionMenu = new StringSelectMenuBuilder()
        .setCustomId("region_select")
        .setPlaceholder("Select Region")
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
        .setPlaceholder("Select Platform")
        .addOptions([
          { label: "PC", value: "1471288525314854912" },
          { label: "Xbox", value: "1471288589450084514" },
          { label: "PlayStation", value: "1471288632135651562" },
          { label: "Mobile", value: "1471288673126449315" }
        ]);

      const ageMenu = new StringSelectMenuBuilder()
        .setCustomId("age_select")
        .setPlaceholder("Select Age")
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
        .setMinValues(0)
        .setMaxValues(5)
        .setPlaceholder("Select Ping Roles")
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

    if (interaction.commandName === "rank") {
      const data = levels[interaction.user.id];
      if (!data) return interaction.reply({ content: "No XP yet.", ephemeral: true });
      return interaction.reply({ content: `Level ${data.level} | XP ${data.xp}/${xpNeeded(data.level)}`, ephemeral: true });
    }

    if (interaction.commandName === "leaderboard") {
      const sorted = Object.entries(levels)
        .sort((a, b) => b[1].level - a[1].level || b[1].xp - a[1].xp)
        .slice(0, 10);

      if (!sorted.length)
        return interaction.reply({ content: "No data yet.", ephemeral: true });

      let desc = "";
      sorted.forEach((u, i) => {
        desc += `**${i + 1}.** <@${u[0]}> — Level ${u[1].level}\n`;
      });

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("🏆 Leaderboard")
        .setDescription(desc);

      return interaction.reply({ embeds: [embed] });
    }
  }

  /* ================= BUTTONS ================= */

  if (interaction.isButton()) {

    const types = {
      ban: "ban-appeal",
      report: "player-report",
      media: "media-app",
      bug: "bug-report"
    };

    if (types[interaction.customId]) {

      if (openTickets.has(interaction.user.id))
        return interaction.reply({ content: "You already have a ticket.", ephemeral: true });

      const channel = await interaction.guild.channels.create({
        name: `${types[interaction.customId]}-${ticketCounter}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: STAFF_ROLE_1, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: STAFF_ROLE_2, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      openTickets.set(interaction.user.id, channel.id);
      ticketCounter++;

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `${interaction.user} ticket created.`,
        components: [closeRow]
      });

      return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    if (interaction.customId === "close_ticket") {

      const transcript = await transcripts.createTranscript(interaction.channel);
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

      await logChannel.send({
        content: `Ticket closed by ${interaction.user}`,
        files: [transcript]
      });

      openTickets.delete(interaction.user.id);
      return interaction.channel.delete();
    }
  }

  /* ================= SELECT MENUS ================= */

  if (interaction.isStringSelectMenu()) {

    const single = ["region_select", "platform_select", "age_select"];
    const selected = interaction.values;

    if (single.includes(interaction.customId)) {
      const rolesToRemove = interaction.component.options.map(o => o.value);
      await interaction.member.roles.remove(rolesToRemove);
      await interaction.member.roles.add(selected[0]);
      return interaction.reply({ content: "Role updated.", ephemeral: true });
    }

    if (interaction.customId === "ping_select") {
      await interaction.member.roles.add(selected);
      return interaction.reply({ content: "Ping roles updated.", ephemeral: true });
    }
  }
});

/* ================= XP ================= */

client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (xpCooldown.has(message.author.id)) return;

  const xp = calculateXP(message);
  if (xp <= 0) return;

  xpCooldown.add(message.author.id);
  setTimeout(() => xpCooldown.delete(message.author.id), 60000);

  if (!levels[message.author.id])
    levels[message.author.id] = { xp: 0, level: 0 };

  levels[message.author.id].xp += xp;

  if (levels[message.author.id].xp >= xpNeeded(levels[message.author.id].level)) {
    levels[message.author.id].level++;
    levels[message.author.id].xp = 0;

    const channel = await client.channels.fetch(LEVELS_CHANNEL_ID);

    channel.send(`💀 ${message.author} reached Level ${levels[message.author.id].level}`);
  }

  saveLevels();
});

client.login(TOKEN);
