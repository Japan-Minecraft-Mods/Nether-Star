const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('BOTのヘルプを表示します。'),
	async execute(interaction) {
		const pages = [
			new EmbedBuilder()
				.setColor(0x0099ff)
				.setTitle('基本コマンド 1/2')
				.addFields(
					{ name: '/ping', value: 'BOTの応答時間をテストします。' },
					{ name: '/help', value: 'このヘルプメニューを表示します。' },
					{ name: '/search_commands', value: 'BOTのコマンドを検索します。' }
				)
				.setTimestamp(),

			new EmbedBuilder()
				.setColor(0x0099ff)
				.setTitle('JMM専用コマンド 2/2')
				.addFields(
					{ name: '/search_modrinth', value: 'Modrinth上にあるプロジェクト(Mod、Modpack、リソースパック等)を検索します' }
				)
				.setTimestamp()
		];

		let pageIndex = 0;
		const buttons = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('prev').setLabel('戻る').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId('next').setLabel('次へ').setStyle(ButtonStyle.Primary)
		);

		const message = await interaction.reply({ embeds: [pages[pageIndex]], components: [buttons], flags: MessageFlags.Ephemeral });

		const collector = message.createMessageComponentCollector({ time: 60000 });

		collector.on('collect', async (buttonInteraction) => {
			if (buttonInteraction.user.id !== interaction.user.id) return;

			if (buttonInteraction.customId === 'prev' && pageIndex > 0) pageIndex--;
			if (buttonInteraction.customId === 'next' && pageIndex < pages.length - 1) pageIndex++;

			await buttonInteraction.update({ embeds: [pages[pageIndex]], components: [buttons] });
		});
	},
};
