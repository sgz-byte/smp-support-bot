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
  PermissionsBitField
} = require("discord.js");

const express = require("express");
const transcripts = require("discord-html-transcripts");

const app = express();
app.get("/", (req, res) => res.send("Bot Alive"));
app.listen(process.env.PORT || 3000);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

/* CONFIG */

const CATEGORY_ID = "1454818204638515310"; // UPDATED
const PANEL_CHANNEL_ID = "1454444771626975305";
const LOG_CHANNEL_ID = "1471050244442558589";
const STAFF_ROLE_1 = "1454488584869646368";
const STAFF_ROLE_2 = "1454449956139302945";

const BANNER_IMAGE = "https://cdn.discordapp.com/attachments/1457429025227280577/1471197949559181603/EC5EE755-447D-41DA-B199-868DE5A1EB65.png?ex=698e0f5c&is=698cbddc&hm=7b0368b0d8e64e27a58b77fcd77d3f5e5d5d2ff1b7b633a4615469abac57d113&";

/* SYSTEM */

let ticketCounter = 1;
const userCooldown = new Map();
let panelSent = false;

/* READY */

client.once("ready", async () => {
  console.log(`${client.user.tag} online`);

  if (panelSent) return;
  panelSent = true;

  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("🎟 GraveSMP Support")
    .setDescription("Select a ticket type below.")
    .setColor("#8B0000")
    .setImage(BANNER_IMAGE);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("media").setLabel("Media").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("bug").setLabel("Bug").setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

/* INTERACTIONS */

client.on("interactionCreate", async (interaction) => {

  try {

    /* BUTTON CLICK */
    if (interaction.isButton()) {

      if (["claim","close","confirmclose","delete"].includes(interaction.customId)) return;

      if (userCooldown.has(interaction.user.id)) {
        return interaction.reply({ content: "Wait before opening another ticket.", ephemeral: true });
      }

      userCooldown.set(interaction.user.id, true);
      setTimeout(() => userCooldown.delete(interaction.user.id), 8000);

      const modal = new ModalBuilder()
        .setCustomId(`modal_${interaction.customId}`)
        .setTitle("Ticket Information");

      const input = new TextInputBuilder()
        .setCustomId("details")
        .setLabel("Describe your issue")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return interaction.showModal(modal);
    }

    /* MODAL SUBMIT */
    if (interaction.isModalSubmit()) {

      const ticketNumber = String(ticketCounter++).padStart(3,"0");

      const channel = await interaction.guild.channels.create({
        name: `ticket-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: STAFF_ROLE_1, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: STAFF_ROLE_2, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle(`Ticket #${ticketNumber}`)
        .setDescription(interaction.fields.getTextInputValue("details"))
        .setColor("#8B0000");

      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Secondary)
      );

      await channel.send({
        content: `Welcome ${interaction.user}\n<@&${STAFF_ROLE_1}> <@&${STAFF_ROLE_2}>`,
        embeds: [embed],
        components: [controls]
      });

      return interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
    }

    /* CLAIM */
    if (interaction.customId === "claim") {
      if (!interaction.member.roles.cache.has(STAFF_ROLE_1) &&
          !interaction.member.roles.cache.has(STAFF_ROLE_2)) {
        return interaction.reply({ content: "Staff only.", ephemeral: true });
      }
      return interaction.reply({ content: `Claimed by ${interaction.user}` });
    }

    /* CLOSE */
    if (interaction.customId === "close") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("confirmclose").setLabel("Confirm Close").setStyle(ButtonStyle.Danger)
      );
      return interaction.reply({ content: "Are you sure?", components: [row] });
    }

    if (interaction.customId === "confirmclose") {
      const attachment = await transcripts.createTranscript(interaction.channel);
      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      await logChannel.send({ files: [attachment] });
      return interaction.channel.delete();
    }

    /* DELETE */
    if (interaction.customId === "delete") {
      return interaction.channel.delete();
    }

  } catch (err) {
    console.log(err);
    if (interaction.replied || interaction.deferred) return;
    interaction.reply({ content: "Something broke. Try again.", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
