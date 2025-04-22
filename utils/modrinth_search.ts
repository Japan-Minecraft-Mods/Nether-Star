import axios from 'axios';

export interface ModData {
    id: string;
    title?: string;
    description?: string;
    icon_url?: string;
    downloads?: number;
    project_type: string;
    published: string;
    loaders?: string[];
    author: string;
    author_icon?: string;
    author_url?: string;
    categories?: string[];
}

export interface VersionInfo {
    version_number: string;
}

export async function searchMod(query: string): Promise<any> {
    const response = await axios.get('https://api.modrinth.com/v2/search', { params: { query } });
    return response.data;
}

export async function fetchModInfo(modId: string): Promise<{
    modData: ModData;
    versionRange: string;
    author: string;
    authorIcon: string | null;
    authorUrl: string;
    category: string;
}> {
    const projectRes = await axios.get<ModData>(`https://api.modrinth.com/v2/project/${modId}`);
    const versionsRes = await axios.get<VersionInfo[]>(`https://api.modrinth.com/v2/project/${modId}/version`);

    const modData = projectRes.data;
    const versions = versionsRes.data;

    const versionRange =
        versions.length > 0
        ? `${versions[0].version_number} - ${versions[versions.length - 1].version_number}`
        : '不明';

    const author = modData.author;
    const authorIcon = modData.author_icon ?? null;
    const authorUrl = modData.author_url ?? '';
    const category = modData.categories?.join(', ') ?? '不明';

    return { modData, versionRange, author, authorIcon, authorUrl, category };
}