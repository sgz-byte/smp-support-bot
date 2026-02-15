const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const transcripts = require("discord-html-transcripts");
const fs = require("fs");
const express = require("express");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// ---------------- ENV ----------------
const TOKEN = process.env.TOKEN;
const CATEGORY_ID = process.env.CATEGORY_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const STAFF_ROLE_1 = process.env.STAFF_ROLE_1;
const STAFF_ROLE_2 = process.env.STAFF_ROLE_2;
const COMMAND_CHANNEL_ID = process.env.COMMAND_CHANNEL_ID;
const GUILD_ID = process.env.GUILD_ID; // your server ID

// ---------------- XP SYSTEM ----------------
let xpData = {};
if (fs.existsSync("./xp.json")) {
  xpData = JSON.parse(fs.readFileSync("./xp.json"));
}

function saveXP() {
  fs.writeFileSync("./xp.json", JSON.stringify(xpData, null, 2));
}

function xpNeeded(level) {
  return 100 + level * 75;
}

// ---------------- READY ----------------
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName("rank").setDescription("Check your rank"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("View top 10 leaderboard"),
    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel"),
    new SlashCommandBuilder().setName("selfroles").setDescription("Send self roles panel")
  ];

  // Register commands per guild for instant availability
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    await guild.commands.set(commands);
    console.log("Slash commands registered in guild:", GUILD_ID);
  } else {
    console.warn("Guild not found! Make sure GUILD_ID is correct and bot is in server.");
  }

  // ---------------- Web server for Render ----------------
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.get("/", (req, res) => res.send("GraveSMP Bot is online!"));
  app.listen(PORT, () => console.log(`Web server listening on port ${PORT}`));
});

// ---------------- MESSAGE XP ----------------
client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  if (message.channel.id === COMMAND_CHANNEL_ID) {
    setTimeout(() => message.delete().catch(() => {}), 5000);
  }

  if (!xpData[message.author.id]) {
    xpData[message.author.id] = { xp: 0, level: 0 };
  }

  const xpGain = Math.floor(Math.random() * 6) + 5;
  xpData[message.author.id].xp += xpGain;

  const needed = xpNeeded(xpData[message.author.id].level);

  if (xpData[message.author.id].xp >= needed) {
    xpData[message.author.id].xp = 0;
    xpData[message.author.id].level += 1;

    message.channel.send(
      `${message.author} leveled up to **Level ${xpData[message.author.id].level}** 🎉`
    );
  }

  saveXP();
});

// ---------------- INTERACTIONS ----------------
client.on("interactionCreate", async interaction => {

  // ---------- SLASH COMMANDS ----------
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "rank") {
      const user = xpData[interaction.user.id] || { xp: 0, level: 0 };
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#8B0000")
            .setTitle(`${interaction.user.username}'s Rank`)
            .addFields(
              { name: "Level", value: user.level.toString(), inline: true },
              { name: "XP", value: user.xp.toString(), inline: true }
            )
        ],
        ephemeral: true
      });
    }

    if (interaction.commandName === "leaderboard") {
      const sorted = Object.entries(xpData)
        .sort((a, b) => b[1].level - a[1].level)
        .slice(0, 10);

      let desc = sorted
        .map((u, i) => `**${i + 1}.** <@${u[0]}> — Level ${u[1].level}`)
        .join("\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#8B0000")
            .setTitle("Leaderboard")
            .setDescription(desc || "No data yet.")
        ]
      });
    }

    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("GraveSMP Support")
        .setDescription("Select a ticket type below.")
        .setImage("EC5EE755-447D-41DA-B199-868DE5A1EB65.png");

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("media").setLabel("Media Application").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("discord").setLabel("Discord Report").setStyle(ButtonStyle.Secondary)
      );

      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("bug").setLabel("Bug Report").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("purchase").setLabel("Purchase Support").setStyle(ButtonStyle.Success)
      );

      const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("connection").setLabel("Connection Issue").setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [embed],
        components: [row1, row2, row3, row4]
      });
    }

    if (interaction.commandName === "selfroles") {

      // ----- Region -----
      const regionMenu = new StringSelectMenuBuilder()
        .setCustomId("region_roles")
        .setPlaceholder("Select your region")
        .addOptions([
          { label: "Europe", value: "1471295797260976249" },
          { label: "North America", value: "1471295844836970646" },
          { label: "South America", value: "1471295885278314710" },
          { label: "Asia", value: "1471295939590225970" },
          { label: "Africa", value: "1471295982376325257" },
          { label: "Oceania", value: "1471296039012139222" }
        ]);

      // ----- Platform -----
      const platformMenu = new StringSelectMenuBuilder()
        .setCustomId("platform_roles")
        .setPlaceholder("Select your platform")
        .addOptions([
          { label: "PC", value: "1471288525314854912" },
          { label: "Xbox", value: "1471288589450084514" },
          { label: "PlayStation", value: "1471288632135651562" },
          { label: "Mobile", value: "1471288673126449315" }
        ]);

      // ----- Age -----
      const ageMenu = new StringSelectMenuBuilder()
        .setCustomId("age_roles")
        .setPlaceholder("Select your age")
        .addOptions([
          { label: "-13", value: "1471296097874870418" },
          { label: "13-14", value: "1471296149242515568" },
          { label: "15-17", value: "1471296183908434061" },
          { label: "18-20", value: "1471296230620663950" },
          { label: "21-24", value: "1471296282038505737" },
          { label: "25+", value: "1471296335746699336" }
        ]);

      // ----- Ping Roles (multi-select) -----
      const pingMenu = new StringSelectMenuBuilder()
        .setCustomId("ping_roles")
        .setPlaceholder("Select your pings")
        .setMinValues(0)
        .setMaxValues(5)
        .addOptions([
          { label: "News", value: "1471296388104065237" },
          { label: "Uploads", value: "1471296438909669549" },
          { label: "Events", value: "1471296477581021336" },
          { label: "Polls", value: "1471296524255363135" },
          { label: "Updates", value: "1471296570271072266" }
        ]);

      const rows = [
        new ActionRowBuilder().addComponents(regionMenu),
        new ActionRowBuilder().addComponents(platformMenu),
        new ActionRowBuilder().addComponents(ageMenu),
        new ActionRowBuilder().addComponents(pingMenu)
      ];

      return interaction.reply({
        content: "Select your roles:",
        components: rows,
        ephemeral: true
      });
    }
  }

  // ---------- SELECT MENU ----------
  if (interaction.isStringSelectMenu()) {
    const category = interaction.customId;
    const selectedRoles = interaction.values;

    // Map of single-choice categories
    const singleChoice = {
      region_roles: ["REGION_EU_ROLEID","REGION_NA_ROLEID","REGION_SA_ROLEID","REGION_ASIA_ROLEID","REGION_AFR_ROLEID","REGION_OC_ROLEID"],
      platform_roles: ["PLATFORM_PC_ROLEID","PLATFORM_XBOX_ROLEID","PLATFORM_PS_ROLEID","PLATFORM_MOBILE_ROLEID"],
      age_roles: ["AGE_UNDER13_ROLEID","AGE_13_14_ROLEID","AGE_15_17_ROLEID","AGE_18_20_ROLEID","AGE_21_24_ROLEID","AGE_25PLUS_ROLEID"]
    };

    // Remove previous roles if single-choice
    if (singleChoice[category]) {
      for (const r of singleChoice[category]) {
        if (interaction.member.roles.cache.has(r)) {
          await interaction.member.roles.remove(r).catch(() => {});
        }
      }
    }

    // Add selected role(s)
    for (const r of selectedRoles) {
      await interaction.member.roles.add(r).catch(() => {});
    }

    return interaction.reply({
      content: "Your roles have been updated!",
      ephemeral: true
    });
  }

  // ---------- BUTTONS ----------
  if (interaction.isButton()) {

    const ticketTypes = {
      ban: "ban-appeal",
      report: "player-report",
      media: "media-application",
      discord: "discord-report",
      bug: "bug-report",
      purchase: "purchase-support",
      connection: "connection-issue"
    };

    if (ticketTypes[interaction.customId]) {

      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${interaction.customId}`)
        .setTitle("Ticket Details");

      const input = new TextInputBuilder()
        .setCustomId("issue_input")
        .setLabel("Describe your issue")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(input)
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId === "close_ticket") {

      const transcript = await transcripts.createTranscript(interaction.channel);
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

      await logChannel.send({
        content: `Ticket closed by ${interaction.user.tag}`,
        files: [transcript]
      });

      return interaction.channel.delete();
    }
  }

  // ---------- MODAL ----------
  if (interaction.isModalSubmit()) {

    const type = interaction.customId.replace("ticket_modal_", "");
    const issue = interaction.fields.getTextInputValue("issue_input");

    const channel = await interaction.guild.channels.create({
      name: `${type}-${Date.now().toString().slice(-4)}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_1, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_2, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `${interaction.user} opened a ticket.`,
      embeds: [
        new EmbedBuilder()
          .setColor("#8B0000")
          .setTitle("Ticket Details")
          .setDescription(issue)
      ],
      components: [closeRow]
    });

    return interaction.reply({
      content: `Ticket created: ${channel}`,
      ephemeral: true
    });
  }

});

client.login(TOKEN);
