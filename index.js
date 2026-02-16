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
  LOG_CHANNEL_ID,
  STAFF_ROLE_ID
} = process.env;

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

      /* ---- CLOSE ---- */

      if (interaction.customId === "close_ticket") {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
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

        switch (type) {
          case "ban_appeal":
            modal.addComponents(
              input("ign", "Minecraft IGN"),
              input("reason", "Why were you banned?", TextInputStyle.Paragraph),
              input("why_unban", "Why should we unban you?", TextInputStyle.Paragraph),
              input("future", "What will you change?")
            );
            break;

          case "player_report":
            modal.addComponents(
              input("your_ign", "Your IGN"),
              input("reported_player", "Player IGN"),
              input("player_id", "Player ID (if known)"),
              input("reason", "Reason for report", TextInputStyle.Paragraph),
              input("evidence", "Evidence links")
            );
            break;

          case "bug_report":
            modal.addComponents(
              input("ign", "Minecraft IGN"),
              input("bug_description", "Describe the bug", TextInputStyle.Paragraph),
              input("how_to_reproduce", "How to reproduce it", TextInputStyle.Paragraph),
              input("server_version", "Server / MC Version")
            );
            break;

          case "media_application":
            modal.addComponents(
              input("channel_name", "Channel Name"),
              input("platform", "Platform"),
              input("link", "Channel Link"),
              input("subs_followers", "Subs / Followers"),
              input("why", "Why should we accept you?", TextInputStyle.Paragraph)
            );
            break;

          case "purchase_support":
            modal.addComponents(
              input("ign", "Minecraft IGN"),
              input("purchase_item", "What did you purchase?"),
              input("transaction_id", "Transaction ID"),
              input("issue", "Describe the issue", TextInputStyle.Paragraph)
            );
            break;

          case "connection_issue":
            modal.addComponents(
              input("ign", "Minecraft IGN"),
              input("error", "Error message"),
              input("version", "Minecraft Version"),
              input("platform", "Platform"),
              input("description", "Describe the issue", TextInputStyle.Paragraph)
            );
            break;
        }

        return interaction.showModal(modal);
      }
    }

    /* ---------- MODAL SUBMIT ---------- */

    if (interaction.isModalSubmit()) {
      const type = interaction.customId.replace("modal_", "");
      const id = ticketData.counter++;

      const channel = await interaction.guild.channels.create({
        name: `ticket-${id}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      ticketData.active[channel.id] = {
        id,
        user: interaction.user.id,
        type
      };

      saveData();

      const fields = [];
      for (const field of interaction.fields.fields.values()) {
        fields.push({
          name: field.customId.replace(/_/g, " ").toUpperCase(),
          value: field.value
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle(`🎟 Ticket #${id}`)
        .addFields(fields)
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        content: `<@&${STAFF_ROLE_ID}>`,
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
