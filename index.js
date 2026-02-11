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

/* ============================= */
/* KEEP RENDER ALIVE */
/* ============================= */

const app = express();
app.get("/", (req, res) => res.send("Alive"));
app.listen(process.env.PORT || 3000);

/* ============================= */
/* CONFIG */
/* ============================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CATEGORY_ID = "1454818204638515310";
const PANEL_CHANNEL_ID = "1454444771626975305";
const LOG_CHANNEL_ID = "1471050244442558589";
const STAFF_ROLE_1 = "1454488584869646368";
const STAFF_ROLE_2 = "1454449956139302945";

const BANNER_IMAGE = "https://cdn.discordapp.com/attachments/1457429025227280577/1471197949559181603/EC5EE755-447D-41DA-B199-868DE5A1EB65.png?ex=698e0f5c&is=698cbddc&hm=7b0368b0d8e64e27a58b77fcd77d3f5e5d5d2ff1b7b633a4615469abac57d113&";

/* ============================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openTickets = new Collection();
const cooldown = new Collection();
let ticketCounter = 1;

/* ============================= */
/* REGISTER SLASH COMMAND */
/* ============================= */

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

/* ============================= */

client.once("ready", async () => {
  console.log(`${client.user.tag} online`);
  await registerCommands();
});

/* ============================= */
/* TICKET FORMS */
/* ============================= */

const forms = {
  ban: ["Your Username", "Platform + Version", "Ban ID", "Why should we unban you?"],
  report: ["Player IGN", "Proof Link", "What happened?"],
  media: ["Your Username", "Your Videos", "Requirements met?"],
  discord: ["Reported User", "Proof Link", "What happened?"],
  bug: ["Bug Name", "Video Link", "Describe bug"],
  purchase: ["Your Username", "What did you buy?", "Issue?"],
  connection: ["Your Username", "Error Message", "Describe issue"]
};

/* ============================= */
/* INTERACTIONS */
/* ============================= */

client.on("interactionCreate", async interaction => {

  /* PANEL COMMAND */
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {

      if (interaction.channel.id !== PANEL_CHANNEL_ID)
        return interaction.reply({ content: "Use this in the panel channel.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("🎟 GraveSMP Support")
        .setDescription("Select a ticket type below.")
        .setColor("#8B0000")
        .setImage(BANNER_IMAGE);

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("media").setLabel("Media Application").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("discord").setLabel("Discord Report").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("bug").setLabel("Bug Report").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("purchase").setLabel("Purchase Support").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("connection").setLabel("Connection Issue").setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row1, row2] });
    }
  }

  /* OPEN TICKET */
  if (interaction.isButton() && forms[interaction.customId]) {

    if (openTickets.has(interaction.user.id))
      return interaction.reply({ content: "You already have an open ticket.", ephemeral: true });

    if (cooldown.has(interaction.user.id))
      return interaction.reply({ content: "Slow down.", ephemeral: true });

    cooldown.set(interaction.user.id, true);
    setTimeout(() => cooldown.delete(interaction.user.id), 5000);

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

  /* SUBMIT FORM */
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
      .setTitle(`Ticket #${number} | ${type}`)
      .setColor("#8B0000");

    forms[type].forEach((q, i) => {
      embed.addFields({ name: q, value: interaction.fields.getTextInputValue(`q${i}`) });
    });

    const controls = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `Welcome ${interaction.user}\nStaff will assist you shortly.\n<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`,
      embeds: [embed],
      components: [controls]
    });

    return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  }

  /* CLAIM */
  if (interaction.customId === "claim") {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_1) &&
        !interaction.member.roles.cache.has(STAFF_ROLE_2))
      return interaction.reply({ content: "Staff only.", ephemeral: true });

    return interaction.reply(`Claimed by ${interaction.user}`);
  }

  /* CLOSE */
  if (interaction.customId === "close") {
    return interaction.reply({
      content: "Are you sure you want to close this ticket?",
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("confirm_close").setLabel("Confirm Close").setStyle(ButtonStyle.Danger)
        )
      ]
    });
  }

  if (interaction.customId === "confirm_close") {
    const transcript = await transcripts.createTranscript(interaction.channel);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    await logChannel.send({ files: [transcript] });

    const owner = interaction.channel.topic;
    openTickets.delete(owner);

    return interaction.channel.delete();
  }

});

client.login(TOKEN);
