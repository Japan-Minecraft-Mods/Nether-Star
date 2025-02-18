const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('BOTの応答時間をテストします。'),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const sent = await interaction.fetchReply();
		const latency = sent.createdTimestamp - interaction.createdTimestamp;
		
		const embed = new EmbedBuilder()
			.setColor(0x800000)
			.setTitle('🏓 Pong!')
			.setDescription(`BOTのPing値は ${latency}ms です。`)
			.setTimestamp();
		
		await interaction.editReply({ embeds: [embed] });
	},
};
