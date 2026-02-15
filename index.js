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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const TOKEN = process.env.TOKEN;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;
const SELFROLE_CHANNEL_ID = process.env.SELFROLE_CHANNEL_ID;

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName("panel").setDescription("Send ticket panel"),
    new SlashCommandBuilder().setName("selfroles").setDescription("Send self role panel")
  ];

  await client.application.commands.set(commands);
});

client.on("interactionCreate", async interaction => {

  // ---------------- SLASH COMMANDS ----------------

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setColor("#8B0000")
        .setTitle("GraveSMP Support")
        .setDescription("Select a ticket type below.")
        .setImage("https://i.imgur.com/Z6aZ8vM.png");

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ban").setLabel("Ban Appeal").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("report").setLabel("Player Report").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("bug").setLabel("Bug Report").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("media").setLabel("Media Application").setStyle(ButtonStyle.Success)
      );

      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("purchase").setLabel("Purchase Support").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("connection issue").setLabel("Suggestion").setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }

    if (interaction.commandName === "selfroles") {

      const menu = new StringSelectMenuBuilder()
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

      const row = new ActionRowBuilder().addComponents(menu);

      return interaction.reply({ content: "Choose your region:", components: [row] });
    }
  }

  // ---------------- SELF ROLE HANDLER ----------------

  if (interaction.isStringSelectMenu()) {
    const roleId = interaction.values[0];
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return;

    await interaction.member.roles.add(role);

    return interaction.reply({ content: `Role ${role.name} added.`, ephemeral: true });
  }

  // ---------------- BUTTON HANDLER ----------------

  if (interaction.isButton()) {

    const type = interaction.customId;

    const modal = new ModalBuilder()
      .setCustomId(`modal_${type}`)
      .setTitle("Ticket Details");

    const inputs = [];

    function addInput(id, label, style = TextInputStyle.Short, required = true) {
      return new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(required)
      );
    }

    if (type === "bug") {
      inputs.push(
        addInput("ign", "Minecraft IGN"),
        addInput("what", "What happened?", TextInputStyle.Paragraph),
        addInput("reproduce", "How to reproduce?", TextInputStyle.Paragraph),
        addInput("time", "When did it happen?"),
        addInput("evidence", "Evidence link (optional)", TextInputStyle.Short, false)
      );
    }

    if (type === "report") {
      inputs.push(
        addInput("yourign", "Your IGN"),
        addInput("player", "Reported Player IGN"),
        addInput("rule", "Rule broken"),
        addInput("details", "What happened?", TextInputStyle.Paragraph),
        addInput("evidence", "Evidence link")
      );
    }

    if (type === "ban") {
      inputs.push(
        addInput("ign", "Minecraft IGN"),
        addInput("reason", "Why were you banned?", TextInputStyle.Paragraph),
        addInput("appeal", "Why should we unban you?", TextInputStyle.Paragraph),
        addInput("change", "What will you do differently?"),
        addInput("extra", "Anything else?", TextInputStyle.Short, false)
      );
    }

    if (type === "media") {
      inputs.push(
        addInput("channel", "Channel Name"),
        addInput("platform", "Platform"),
        addInput("link", "Channel Link"),
        addInput("views", "Average Views"),
        addInput("why", "Why should we accept you?", TextInputStyle.Paragraph)
      );
    }

    if (type === "purchase") {
      inputs.push(
        addInput("ign", "Minecraft IGN"),
        addInput("item", "What did you purchase?"),
        addInput("date", "Date of purchase"),
        addInput("problem", "Describe the issue", TextInputStyle.Paragraph),
        addInput("tx", "Transaction ID (optional)", TextInputStyle.Short, false)
      );
    }

    if (type === "connection issue") {
      inputs.push(
        addInput("ign", "Minecraft IGN"),
        addInput("desc", "Full description of the issue", TextInputStyle.Paragraph),
        addInput("platform", "what do you play on?"),
        addInput("examples", "Examples (optional)", TextInputStyle.Short, false),
        addInput("extra", "Anything else?", TextInputStyle.Short, false)
      );
    }

    modal.addComponents(...inputs);

    return interaction.showModal(modal);
  }

  // ---------------- MODAL SUBMIT ----------------

  if (interaction.isModalSubmit()) {

    const type = interaction.customId.replace("modal_", "");

    const channel = await interaction.guild.channels.create({
      name: `${type}-${interaction.user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const fields = interaction.fields.fields.map(f => ({
      name: f[1].customId,
      value: f[1].value || "N/A"
    }));

    const embed = new EmbedBuilder()
      .setColor("#8B0000")
      .setTitle(`Ticket: ${type}`)
      .setDescription(`Opened by ${interaction.user}`)
      .addFields(fields);

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@&${STAFF_ROLE_ID}>`,
      embeds: [embed],
      components: [closeRow]
    });

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    logChannel.send(`New ticket created: ${channel}`);

    return interaction.reply({
      content: `Your ticket has been created: ${channel}`,
      ephemeral: true
    });
  }

  // ---------------- CLOSE ----------------

  if (interaction.isButton() && interaction.customId === "close_ticket") {

    const transcript = await transcripts.createTranscript(interaction.channel);

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    await logChannel.send({
      content: `Ticket closed by ${interaction.user.tag}`,
      files: [transcript]
    });

    await interaction.reply({ content: "Closing ticket in 5 seconds..." });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
  }
});

client.login(TOKEN);
