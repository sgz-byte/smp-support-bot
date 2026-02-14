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
  StringSelectMenuBuilder
} = require("discord.js");

const transcripts = require("discord-html-transcripts");
const express = require("express");
const fs = require("fs");

/* ================= KEEP ALIVE ================= */

const app = express();
app.get("/", (req, res) => res.send("Alive"));
app.listen(process.env.PORT || 3000);

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const PANEL_CHANNEL_ID = "1454444771626975305";
const LOG_CHANNEL_ID = "1471050244442558589";
const LEVELS_CHANNEL_ID = "1471278932581023968";
const ROLES_CHANNEL_ID = "1471287988448268411";

const CATEGORY_ID = "1454818204638515310";

const STAFF_ROLE_1 = "1454488584869646368";
const STAFF_ROLE_2 = "1454449956139302945";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= REGISTER COMMANDS ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel"),
    new SlashCommandBuilder().setName("roles").setDescription("Send self role panel"),
    new SlashCommandBuilder().setName("rank").setDescription("Check your rank"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("View leaderboard")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

client.once("ready", async () => {
  console.log("Bot online");
  await registerCommands();
});

/* ================= LEVEL SYSTEM ================= */

const LEVEL_FILE = "./levels.json";

let levels = fs.existsSync(LEVEL_FILE)
  ? JSON.parse(fs.readFileSync(LEVEL_FILE))
  : {};

function saveLevels() {
  fs.writeFileSync(LEVEL_FILE, JSON.stringify(levels, null, 2));
}

function xpNeeded(level) {
  return 100 + (level * 75);
}

const xpCooldown = new Set();

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (xpCooldown.has(message.author.id)) return;

  xpCooldown.add(message.author.id);
  setTimeout(() => xpCooldown.delete(message.author.id), 30000);

  const xpGain = Math.floor(Math.random() * 15) + 10;

  if (!levels[message.author.id])
    levels[message.author.id] = { xp: 0, level: 0 };

  levels[message.author.id].xp += xpGain;

  const needed = xpNeeded(levels[message.author.id].level);

  if (levels[message.author.id].xp >= needed) {

    levels[message.author.id].level++;
    levels[message.author.id].xp = 0;

    const levelChannel = await client.channels.fetch(LEVELS_CHANNEL_ID);

    levelChannel.send(
      `💀 ${message.author} reached Level ${levels[message.author.id].level}`
    );
  }

  saveLevels();
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {

  try {

    /* ================= SLASH COMMANDS ================= */

    if (interaction.isChatInputCommand()) {

      const isStaff =
        interaction.member.roles.cache.has(STAFF_ROLE_1) ||
        interaction.member.roles.cache.has(STAFF_ROLE_2);

      /* PANEL */
      if (interaction.commandName === "panel") {

        if (!isStaff)
          return interaction.reply({ content: "Staff only.", ephemeral: true });

        if (interaction.channel.id !== PANEL_CHANNEL_ID)
          return interaction.reply({ content: "Wrong channel.", ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle("🎟 Support Tickets")
          .setDescription("Click a button to open a ticket.")
          .setColor("#8B0000");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ticket").setLabel("Open Ticket").setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      /* ROLES */
      if (interaction.commandName === "roles") {

        if (interaction.channel.id !== ROLES_CHANNEL_ID)
          return interaction.reply({ content: "Wrong channel.", ephemeral: true });

        const regionMenu = new StringSelectMenuBuilder()
          .setCustomId("region")
          .setPlaceholder("Select Region")
          .addOptions([
            { label: "Europe", value: "1471295797260976249" },
            { label: "North America", value: "1471295844836970646" }
          ]);

        const row = new ActionRowBuilder().addComponents(regionMenu);

        return interaction.reply({ content: "Choose roles:", components: [row] });
      }

      /* RANK */
      if (interaction.commandName === "rank") {

        const data = levels[interaction.user.id];

        if (!data)
          return interaction.reply({ content: "No XP yet.", ephemeral: true });

        return interaction.reply({
          content: `Level ${data.level} | XP ${data.xp}/${xpNeeded(data.level)}`,
          ephemeral: true
        });
      }

      /* LEADERBOARD */
      if (interaction.commandName === "leaderboard") {

        const sorted = Object.entries(levels)
          .sort((a, b) => b[1].level - a[1].level)
          .slice(0, 10);

        let text = "";

        sorted.forEach((user, i) => {
          text += `**${i + 1}.** <@${user[0]}> - Level ${user[1].level}\n`;
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🏆 Leaderboard")
              .setDescription(text || "No data")
              .setColor("#8B0000")
          ]
        });
      }
    }

    /* ================= BUTTON ================= */

    if (interaction.isButton()) {

      if (interaction.customId === "ticket") {

        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: STAFF_ROLE_1,
              allow: [PermissionsBitField.Flags.ViewChannel]
            }
          ]
        });

        return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
      }
    }

    /* ================= SELECT MENU ================= */

    if (interaction.isStringSelectMenu()) {

      if (interaction.customId === "region") {

        await interaction.member.roles.add(interaction.values[0]);

        return interaction.reply({ content: "Role updated.", ephemeral: true });
      }
    }

  } catch (err) {
    console.log(err);
    if (!interaction.replied)
      interaction.reply({ content: "Error occurred.", ephemeral: true });
  }
});

client.login(TOKEN);
