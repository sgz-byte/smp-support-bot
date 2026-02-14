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

const BANNER_IMAGE = "https://cdn.discordapp.com/attachments/1457429025227280577/1471197949559181603/EC5EE755-447D-41DA-B199-868DE5A1EB65.png";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= REGISTER SLASH COMMANDS ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel"),
    new SlashCommandBuilder().setName("roles").setDescription("Send self roles"),
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
  console.log("Bot Online");
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

    const isStaff =
      interaction.member?.roles.cache.has(STAFF_ROLE_1) ||
      interaction.member?.roles.cache.has(STAFF_ROLE_2);

    /* ================= SLASH COMMANDS ================= */

    if (interaction.isChatInputCommand()) {

      /* PANEL */
      if (interaction.commandName === "panel") {

        if (!isStaff)
          return interaction.reply({ content: "Staff only.", ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle("🎟 GraveSMP Support")
          .setDescription("Select a ticket type below.")
          .setColor("#8B0000")
          .setImage(BANNER_IMAGE);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("media").setLabel("Media Application").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("bug").setLabel("Bug Report").setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      /* ROLES */
      if (interaction.commandName === "roles") {

        const embed = new EmbedBuilder()
          .setTitle("🎭 Choose Your Roles")
          .setColor("#8B0000");

        const region = new StringSelectMenuBuilder()
          .setCustomId("region")
          .setPlaceholder("Select Region")
          .addOptions([
            { label: "Europe", value: "1471295797260976249" },
            { label: "North America", value: "1471295844836970646" },
            { label: "South America", value: "1471295885278314710" },
            { label: "Asia", value: "1471295939590225970" },
            { label: "Africa", value: "1471295982376325257" },
            { label: "Oceania", value: "1471296039012139222" }
          ]);

        const platform = new StringSelectMenuBuilder()
          .setCustomId("platform")
          .setPlaceholder("Select Platform")
          .addOptions([
            { label: "PC", value: "1471288525314854912" },
            { label: "Xbox", value: "1471288589450084514" },
            { label: "PlayStation", value: "1471288632135651562" },
            { label: "Mobile", value: "1471288673126449315" }
          ]);

        const age = new StringSelectMenuBuilder()
          .setCustomId("age")
          .setPlaceholder("Select Age")
          .addOptions([
            { label: "-13", value: "1471296097874870418" },
            { label: "13-14", value: "1471296149242515568" },
            { label: "15-17", value: "1471296183908434061" },
            { label: "18-20", value: "1471296230620663950" },
            { label: "21-24", value: "1471296282038505737" },
            { label: "25+", value: "1471296335746699336" }
          ]);

        const ping = new StringSelectMenuBuilder()
          .setCustomId("ping")
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
            new ActionRowBuilder().addComponents(region),
            new ActionRowBuilder().addComponents(platform),
            new ActionRowBuilder().addComponents(age),
            new ActionRowBuilder().addComponents(ping)
          ]
        });
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
        sorted.forEach((u, i) => {
          text += `**${i + 1}.** <@${u[0]}> - Level ${u[1].level}\n`;
        });

        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🏆 Grave Leaderboard")
              .setColor("#8B0000")
              .setDescription(text || "No data yet.")
          ]
        });
      }
    }

    /* ================= BUTTONS ================= */

    if (interaction.isButton()) {

      if (["ban", "report", "media", "bug"].includes(interaction.customId)) {

        const modal = new ModalBuilder()
          .setCustomId(`modal_${interaction.customId}`)
          .setTitle("Ticket Information");

        const input = new TextInputBuilder()
          .setCustomId("details")
          .setLabel("Explain your issue")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        return interaction.showModal(modal);
      }

      if (interaction.customId === "close_ticket") {

        const transcript = await transcripts.createTranscript(interaction.channel);

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        await logChannel.send({
          content: `Transcript from ${interaction.channel.name}`,
          files: [transcript]
        });

        return interaction.channel.delete();
      }
    }

    /* ================= MODAL SUBMIT ================= */

    if (interaction.isModalSubmit()) {

      const details = interaction.fields.getTextInputValue("details");

      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: STAFF_ROLE_1, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `Ticket opened by ${interaction.user}`,
        embeds: [
          new EmbedBuilder()
            .setTitle("Ticket Details")
            .setDescription(details)
            .setColor("#8B0000")
        ],
        components: [closeButton]
      });

      return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    /* ================= SELECT MENUS ================= */

    if (interaction.isStringSelectMenu()) {

      if (["region", "platform", "age", "ping"].includes(interaction.customId)) {

        if (interaction.customId !== "ping") {
          const rolesToRemove = interaction.component.options.map(o => o.value);
          await interaction.member.roles.remove(rolesToRemove);
        }

        await interaction.member.roles.add(interaction.values);

        return interaction.reply({ content: "Roles updated.", ephemeral: true });
      }
    }

  } catch (err) {
    console.log(err);
    if (!interaction.replied)
      interaction.reply({ content: "An error occurred.", ephemeral: true });
  }
});

client.login(TOKEN);
