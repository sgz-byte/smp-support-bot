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
} = require("discord.js");

const transcripts = require("discord-html-transcripts");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const {
  TOKEN,
  TICKET_CATEGORY_ID,
  LOG_CHANNEL_ID,
  STAFF_ROLE_ID
} = process.env;

const PANEL_IMAGE = "https://cdn.discordapp.com/attachments/1457429025227280577/1471197949559181603/EC5EE755-447D-41DA-B199-868DE5A1EB65.png?ex=6993555c&is=699203dc&hm=df8920e3355db4e575012756999da243dcfde0856eb79a3ee3a2207b7e00c4bc&";

/* ================= LOAD DATA ================= */

let ticketData = JSON.parse(fs.readFileSync("./tickets.json"));

function saveData() {
  fs.writeFileSync("./tickets.json", JSON.stringify(ticketData, null, 2));
}

/* ================= READY ================= */

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.application.commands.set([
    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel")
  ]);
});

/* ================= UTIL ================= */

function buildInput(id, label, style = TextInputStyle.Short, required = true) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setStyle(style)
      .setRequired(required)
  );
}

function formatField(id) {
  return id.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

/* ================= INTERACTION ================= */

client.on("interactionCreate", async interaction => {

  /* ---------- PANEL COMMAND ---------- */

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("🎟 GraveSMP Support")
        .setDescription("Select the type of support you need below.")
        .setImage(PANEL_IMAGE);

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_ban_appeal").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("ticket_player_report").setLabel("Player Report").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_bug_report").setLabel("Bug Report").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ticket_media_application").setLabel("Media Application").setStyle(ButtonStyle.Success)
      );

      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_purchase_support").setLabel("Purchase Support").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("ticket_connection_issue").setLabel("Connection Issue").setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
  }

  /* ---------- BUTTON CLICK ---------- */

  if (interaction.isButton()) {

    /* ----- CLOSE ----- */

    if (interaction.customId === "close_ticket") {

      const ticketInfo = ticketData.active[interaction.channel.id];
      if (!ticketInfo) return;

      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
        return interaction.reply({ content: "Staff only.", ephemeral: true });

      const transcript = await transcripts.createTranscript(interaction.channel);

      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("Ticket Closed")
            .addFields(
              { name: "Ticket ID", value: ticketInfo.id.toString(), inline: true },
              { name: "Type", value: ticketInfo.type, inline: true },
              { name: "User", value: `<@${ticketInfo.user}>`, inline: true }
            )
        ],
        files: [transcript]
      });

      delete ticketData.active[interaction.channel.id];
      saveData();

      await interaction.reply({ content: "Closing ticket..." });

      setTimeout(() => interaction.channel.delete().catch(() => {}), 4000);
      return;
    }

    /* ----- CLAIM ----- */

    if (interaction.customId === "claim_ticket") {

      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID))
        return interaction.reply({ content: "Staff only.", ephemeral: true });

      const info = ticketData.active[interaction.channel.id];
      if (!info) return;

      if (info.claimed)
        return interaction.reply({ content: "Already claimed.", ephemeral: true });

      info.claimed = interaction.user.id;
      saveData();

      return interaction.reply(`Ticket claimed by ${interaction.user}`);
    }

    /* ----- OPEN TICKET ----- */

    if (interaction.customId.startsWith("ticket_")) {

      const type = interaction.customId.replace("ticket_", "");

      const existing = Object.entries(ticketData.active).find(
        ([, value]) => value.user === interaction.user.id
      );

      if (existing)
        return interaction.reply({
          content: "You already have an open ticket.",
          ephemeral: true
        });

      const modal = new ModalBuilder()
        .setCustomId(`modal_${type}`)
        .setTitle("Ticket Details");

      let inputs = [];

      switch (type) {
        case "ban_appeal":
          inputs = [
            buildInput("minecraft_ign", "Minecraft IGN"),
            buildInput("why_banned", "Why were you banned?", TextInputStyle.Paragraph),
            buildInput("why_unban", "Why should we unban you?", TextInputStyle.Paragraph),
            buildInput("future_behavior", "What will you change?")
          ];
          break;

        case "connection_issue":
          inputs = [
            buildInput("minecraft_ign", "Minecraft IGN"),
            buildInput("error_message", "Error message (if any)", TextInputStyle.Short, false),
            buildInput("description", "Describe the issue", TextInputStyle.Paragraph),
            buildInput("version", "Minecraft Version"),
            buildInput("platform", "Platform")
          ];
          break;

        default:
          inputs = [
            buildInput("minecraft_ign", "Minecraft IGN"),
            buildInput("description", "Describe your issue", TextInputStyle.Paragraph)
          ];
      }

      modal.addComponents(...inputs);
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
      type,
      claimed: null
    };

    saveData();

    const fields = interaction.fields.fields.map(f => ({
      name: formatField(f[1].customId),
      value: f[1].value
    }));

    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setTitle(`🎟 Ticket #${id} | ${type.replace(/_/g, " ").toUpperCase()}`)
      .setDescription(`Opened by ${interaction.user}`)
      .addFields(fields)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
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

    saveData();
  }

});

client.login(TOKEN);
