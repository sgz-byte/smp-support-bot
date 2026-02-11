const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const transcript = require("discord-html-transcripts");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ENV VARIABLES (Render)
const TOKEN = process.env.TOKEN;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

client.once("ready", () => {
  console.log(`${client.user.tag} online`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  // CREATE TICKET
  if (["media", "bug", "purchase"].includes(interaction.customId)) {
    const channel = await interaction.guild.channels.create({
      name: `${interaction.customId}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(`📩 ${interaction.customId.toUpperCase()} TICKET`)
      .setDescription(`Hello ${interaction.user}, please provide all required info.\nA staff member will assist you.`)
      .setColor(0x5865F2);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("❌ Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [closeRow] });
    await interaction.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  }

  // CLOSE TICKET
  if (interaction.customId === "close_ticket") {
    await interaction.deferReply({ ephemeral: true });

    const attachment = await transcript.createTranscript(interaction.channel, {
      limit: -1,
      returnType: "attachment",
      filename: `ticket-${interaction.channel.name}.html`
    });

    const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

    await logChannel.send({
      content: `📄 Transcript for **${interaction.channel.name}**`,
      files: [attachment]
    });

    await interaction.channel.delete();
  }
});

client.login(TOKEN);
