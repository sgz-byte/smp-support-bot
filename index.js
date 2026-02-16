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
  SlashCommandBuilder
} = require("discord.js");

const transcripts = require("discord-html-transcripts");
const fs = require("fs");
const express = require("express");

/* ================= EXPRESS (FOR RENDER WEB SERVICE) ================= */

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running.");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

/* ================= ENV ================= */

const {
  TOKEN,
  TICKET_CATEGORY_ID,
  LOG_CHANNEL_ID
} = process.env;

/* ================= STAFF ROLES ================= */

const STAFF_ROLES = [
  "1454488584869646368", // Grave / Owner
  "1454449956139302945", // Admin
  "1471643410669506741", // SMP Admin
  "1471643452151169258", // Mod
  "1471643489467891772", // SMP Mod
  "1471049595847966812", // Helper
  "1471643366767722752"  // SMP Helper
];

/* ================= PANEL IMAGE ================= */

const PANEL_IMAGE =
  "https://cdn.discordapp.com/attachments/1457429025227280577/1471197949559181603/EC5EE755-447D-41DA-B199-868DE5A1EB65.png";

/* ================= DATA ================= */

const dataPath = "./tickets.json";

if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(
    dataPath,
    JSON.stringify({ counter: 1, active: {} }, null, 2)
  );
}

let ticketData = JSON.parse(fs.readFileSync(dataPath));

function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(ticketData, null, 2));
}

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.application.commands.set([
    new SlashCommandBuilder()
      .setName("panel")
      .setDescription("Send the ticket panel")
  ]);
});

/* ================= PANEL ================= */

function buildPanel() {
  const embed = new EmbedBuilder()
    .setColor("#8B0000")
    .setTitle("🎟 GraveSMP Support")
    .setDescription("Select the type of support you need.")
    .setImage(PANEL_IMAGE);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_ban_appeal")
      .setLabel("Ban Appeal")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ticket_player_report")
      .setLabel("Player Report")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_bug_report")
      .setLabel("Bug Report")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_media_application")
      .setLabel("Media Application")
      .setStyle(ButtonStyle.Success)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_purchase_support")
      .setLabel("Purchase Support")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket_connection_issue")
      .setLabel("Connection Issue")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row1, row2, row3] };
}

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {
  try {

    /* ---------- SLASH ---------- */

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "panel") {
        const panel = buildPanel();
        return interaction.reply({
          embeds: [panel.embed],
          components: panel.components
        });
      }
    }

    /* ---------- BUTTON ---------- */

    if (interaction.isButton()) {

      /* ---- CLOSE TICKET ---- */

      if (interaction.customId === "close_ticket") {

        const isStaff = interaction.member.roles.cache
          .some(role => STAFF_ROLES.includes(role.id));

        if (!isStaff)
          return interaction.reply({ content: "Staff only.", ephemeral: true });

        const ticket = ticketData.active[interaction.channel.id];
        if (!ticket) return;

        const transcript = await transcripts.createTranscript(interaction.channel);
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("Ticket Closed")
              .addFields(
                { name: "Ticket ID", value: ticket.id.toString(), inline: true },
                { name: "Type", value: ticket.type, inline: true },
                { name: "User", value: `<@${ticket.user}>`, inline: true }
              )
          ],
          files: [transcript]
        });

        delete ticketData.active[interaction.channel.id];
        saveData();

        await interaction.reply("Closing ticket...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        return;
      }

      /* ---- OPEN TICKET ---- */

      if (interaction.customId.startsWith("ticket_")) {
        const type = interaction.customId.replace("ticket_", "");

        const existing = Object.values(ticketData.active).find(
          t => t.user === interaction.user.id
        );

        if (existing)
          return interaction.reply({
            content: "You already have an open ticket.",
            ephemeral: true
          });

        const modal = new ModalBuilder()
          .setCustomId(`modal_${type}`)
          .setTitle("Ticket Information");

        function input(id, label, style = TextInputStyle.Short) {
          return new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(id)
              .setLabel(label)
              .setStyle(style)
              .setRequired(true)
          );
        }

        modal.addComponents(
          input("ign", "Minecraft IGN"),
          input("details", "Explain your issue", TextInputStyle.Paragraph)
        );

        return interaction.showModal(modal);
      }
    }

    /* ---------- MODAL SUBMIT ---------- */

    if (interaction.isModalSubmit()) {
      const id = ticketData.counter++;

      const channel = await interaction.guild.channels.create({
        name: `ticket-${id}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          ...STAFF_ROLES.map(roleId => ({
            id: roleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }))
        ]
      });

      ticketData.active[channel.id] = {
        id,
        user: interaction.user.id
      };

      saveData();

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`🎟 Ticket #${id}`)
        .addFields(
          { name: "IGN", value: interaction.fields.getTextInputValue("ign") },
          { name: "Details", value: interaction.fields.getTextInputValue("details") }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: `Your ticket has been created: ${channel}`,
        ephemeral: true
      });
    }

  } catch (err) {
    console.error(err);
  }
});

client.login(TOKEN);
