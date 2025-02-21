const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modinfo')
    .setDescription('ModrinthのMODの詳細を表示')
    .addStringOption(option => 
      option.setName('query')
        .setDescription('MODのID、名前、またはURL')
        .setRequired(true)),

  async execute(interaction) {
    const query = interaction.options.getString('query');
    let modId = query;

    // URLからIDを抽出
    const urlMatch = query.match(/modrinth\.com\/mod\/([^\/]+)/);
    if (urlMatch) {
      modId = urlMatch[1];
      console.log(`URLから抽出されたID: ${modId}`);
    }

    // modId が Modrinth の Project ID 形式ではない場合に検索
    if (modId === query) {  // 変更点: ここで元の入力値と同じなら検索へ
      console.log('検索処理に入る');
      
      const searchUrl = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&index=downloads`;
      const searchResponse = await fetch(searchUrl);
      
      if (!searchResponse.ok) {
        console.error(`検索エラー: ステータスコード ${searchResponse.status}`);
        return interaction.reply({ content: '検索に失敗しました。', flags: MessageFlags.Ephemeral });
      }

      const searchData = await searchResponse.json();
      if (searchData.hits.length === 0) {
        return interaction.reply({ content: '該当するMODが見つかりませんでした。', flags: MessageFlags.Ephemeral });
      }

      modId = searchData.hits[0].project_id;
      console.log(`検索結果のID: ${modId}`);
    } else {
      console.log(`modIdはそのまま使用: ${modId}`);
    }

    const apiUrl = `https://api.modrinth.com/v2/project/${modId}`;
    const memberUrl = `https://api.modrinth.com/v2/project/${modId}/members`;
    const versionsUrl = `https://api.modrinth.com/v2/project/${modId}/version`;
    const organizationUrl = `https://api.modrinth.com/v3/project/${modId}/organization`;

    try {
      // MOD情報の取得
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`APIエラー: ステータスコード ${response.status}`);
        return interaction.reply({ content: '通信に失敗しました。\n少し時間を置いてから、もう一度お試しください', flags: MessageFlags.Ephemeral });
      }
      const data = await response.json();
      if (!data || !data.id) {
        console.error('APIエラー: MODが見つかりませんでした。');
        return interaction.reply({ content: 'MODが見つかりませんでした。MOD名を確認してください。', flags: MessageFlags.Ephemeral });
      }

      // バージョンの取得
      const versionsResponse = await fetch(versionsUrl);
      if (!versionsResponse.ok) {
        console.error(`バージョン情報の取得エラー: ステータスコード ${versionsResponse.status}`);
        return interaction.reply({ content: 'バージョン情報の取得に失敗しました。', flags: MessageFlags.Ephemeral });
      }
      // バージョンをソート
      const versionsData = await versionsResponse.json();
      const filteredVersions = versionsData.map(version => version.game_versions).flat().filter(version => !/[w|pre|rc]/i.test(version)).sort((a, b) => {
        const parseVersion = v => v.replace(/[^\d.]/g, '').split('.').map(Number);
        const [a1, a2, a3] = parseVersion(a);
        const [b1, b2, b3] = parseVersion(b);
        return b1 - a1 || b2 - a2 || b3 - a3;
      });
      const versionRange = filteredVersions.length > 1 ? `${filteredVersions[0]}-${filteredVersions[filteredVersions.length - 1]}` : (filteredVersions.length === 1 ? filteredVersions[0] : 'No versions available');

      // 作者名の取得
      const memberResponse = await fetch(memberUrl);
      if (!memberResponse.ok) {
        console.error(`作者情報の取得エラー: ステータスコード ${memberResponse.status}`);
        return interaction.reply({ content: '作者情報の取得に失敗しました。', flags: MessageFlags.Ephemeral });
      }
      const memberData = await memberResponse.json();
      const organizationResponse = await fetch(organizationUrl);
      let organizationData = null;
      if (organizationResponse.ok) {
        organizationData = await organizationResponse.json();
      }
      const member = memberData.find(member => member.role === 'Owner');
      const author = organizationData ? organizationData.name : (member ? member.user.username : (memberData.length > 0 ? memberData[0].user.username : 'Unknown'));
      const authorIcon = organizationData ? organizationData.icon_url : (member ? member.user.avatar_url : (memberData.length > 0 ? memberData[0].user.avatar_url : 'https://avatars.githubusercontent.com/u/11223344?v=1'));
      const authorUrl = organizationData ? `https://modrinth.com/organization/${organizationData.slug}` : (member ? `https://modrinth.com/user/${member.user.username}` : (memberData.length > 0 ? `https://modrinth.com/user/${memberData[0].user.username}` : '#'));

      // Category を適切に表示
      const category = Array.isArray(data.categories) ? data.categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)).join(', ') : (data.categories || 'No category');

      // 日付と時間の書式を変更
      const publishedDate = data.published ? new Date(data.published).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '日付なし';

      // ダウンロード数を読みやすくする
      const downloads = data.downloads ? data.downloads.toLocaleString() : '0';

      // ローダーを適切に表示し、"Minecraft"を"Vanilla"に変換
      const loaders = data.loaders ? data.loaders.map(loader => loader === 'Minecraft' ? 'Vanilla' : loader.charAt(0).toUpperCase() + loader.slice(1)).join('\n') : 'ローダーが設定されていません';

      // ファイルのジャンルを取得
      const projectType = data.project_type ? data.project_type.charAt(0).toUpperCase() + data.project_type.slice(1) : 'ジャンルなし';

      // Embedを作成
      const modEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setAuthor({ name: author || 'Unknown', iconURL: authorIcon, url: authorUrl })
        .setTitle(data.title || 'タイトルが設定されていません')
        .setURL(`https://modrinth.com/mod/${data.id}`)
        .setThumbnail(data.icon_url || '')
        .addFields(
          { name: '', value: data.description || '概要が設定されていません' },
          { name: 'Loader', value: loaders, inline: true },
          { name: 'Version', value: versionRange || 'バージョンが設定されていません', inline: true },
          { name: 'Downloads', value: downloads, inline: true },
        )
        .setFooter({ text: `Modrinth ${projectType}  |  ${category}` || 'カテゴリーなし' })
        .setTimestamp(new Date(data.published));

      return interaction.reply({ embeds: [modEmbed] });

    } catch (error) {
      console.error('エラー詳細:', error);
      return interaction.reply({ content: 'MOD情報の取得中にエラーが発生しました。', flags: MessageFlags.Ephemeral });
    }
  },
};