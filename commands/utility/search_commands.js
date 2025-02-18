const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search_commands')
		.setDescription('BOTのコマンドを検索します。')
		.addStringOption(option =>
			option.setName('query')
				.setDescription('検索するコマンド名またはキーワード')
				.setRequired(true)
		),
	async execute(interaction) {
		const query = interaction.options.getString('query').toLowerCase();

		// クライアントのコマンドデータを取得
		const commands = interaction.client.commands.map(cmd => ({
			name: cmd.data.name,
			description: cmd.data.description
		}));

		// 検索キーワードを含むコマンドをフィルタリング
		const results = commands.filter(cmd =>
			cmd.name.toLowerCase().includes(query) || cmd.description.toLowerCase().includes(query)
		);

		// 結果が見つからなかった場合の処理
		if (results.length === 0) {
			return interaction.reply({
				content: `「${query}」に関連するコマンドは見つかりませんでした。`,
				ephemeral: true
			});
		}

		// 結果が見つかった場合に表示するEmbedを作成
		const embed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle(`検索結果: "${query}"`)
			.addFields(
				results.map(cmd => ({
					name: `/${cmd.name}`,  
					value: cmd.description
				}))
			)
			.setTimestamp();

		// 結果を返す
		return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	},
};
