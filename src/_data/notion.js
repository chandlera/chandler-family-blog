const Cache = require("@11ty/eleventy-cache-assets");
require("dotenv").config();

const ROOT_NOTION_API = 'https://api.notion.com/v1';
const NOTION_API_VERSION = '2025-09-03';

const getDataSourceId = async () => {
    try {
        const databaseResponse = await Cache(`${ROOT_NOTION_API}/databases/${process.env.DATABASE_ID}`, {
            duration: "1d",
            type: "json",
            fetchOptions: {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
                    "Notion-Version": NOTION_API_VERSION,
                    "Content-Type": "application/json"
                }
            }
        });

        // Get the first data source from the database
        if (databaseResponse.data_sources && databaseResponse.data_sources.length > 0) {
            return databaseResponse.data_sources[0].id;
        }
        throw new Error("No data sources found in database");
    } catch (error) {
        console.error("Error fetching data source ID:", error.message);
        throw error;
    }
}

const getDatabaseData = async () => {
    const filter = {
        "filter": {
            "property": "Status",
            "select": {
                "equals": "Published"
            }
        },
        "sorts": [
            {
                "property": "Published",
                "direction": "ascending"
            }
        ]
    };

    try {
        const dataSourceId = await getDataSourceId();

        const dataBaseData = await Cache(`${ROOT_NOTION_API}/data_sources/${dataSourceId}/query`, {
            duration: "1d",
            type: "json",
            dryRun: true,
            fetchOptions: {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
                    "Notion-Version": NOTION_API_VERSION,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(filter)
            }
        });

        return dataBaseData.results;
    } catch (error) {
        console.error("Error fetching Notion database:", error.message);
        return [];
    }
}

const getPageBlockChildrenData = async (blockId) => {
    const pageData = await Cache(`${ROOT_NOTION_API}/blocks/${blockId}/children`, {
        duration: "1d",
        type: "json",
        fetchOptions: {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
                "Notion-Version": NOTION_API_VERSION,
                "Content-Type": "application/json"
            }
        }
    });
    return pageData;
}

function slugify(text) {
    return text ? text.toString().toLowerCase().trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/&/g, '-and-')
      .replace(/[^\w\-]+/g, '')
      .replace(/--+/g, '-') : '';
}

const mapNotionResponseToTextContent = ([key, property]) => {
    try {
        switch (property.type) {
            case "rich_text":
            case "text":
            case "title":
                if (property[property.type] && Array.isArray(property[property.type]) && property[property.type].length > 0) {
                    return {
                        [`${key}`]: property[property.type][0]?.text?.content || ''
                    };
                }
                break;
            case "files":
                if (property[property.type] && Array.isArray(property[property.type]) && property[property.type].length > 0) {
                    return {
                        [`${key}`]: property[property.type][0]?.file?.url || ''
                    };
                }
                break;
            case "select":
                if (property[property.type]) {
                    return {
                        [`${key}`]: property[property.type]?.name || ''
                    };
                }
                break;
            default:
                break;
        }
    } catch (error) {
        console.warn(`Error mapping property ${key}:`, error.message);
    }
};

module.exports = async function () {
    try {
        const databaseData = await getDatabaseData();

        // parse the notion response down to something more reasonable
        const results = databaseData.map((post, index) => {
            const flattenedProperties = Object.entries(post.properties)
            .filter(
                ([key, property]) =>
                property.select || (property[property.type] && property[property.type].length)
            )
            .map(mapNotionResponseToTextContent)
            .reduce((previousValue, currentValue, currentIndex, array) => {
              return {
                ...previousValue,
                ...currentValue
              }
            }, {});

            return {
                id: post.id,
                created: post.created_time,
                url: post.url,
                slug: slugify(flattenedProperties.Title),
                ...flattenedProperties,
            };
        });

        const finalResult = await Promise.all(results.map(async (result) => {
            const blockData = await getPageBlockChildrenData(result.id);

            const mappedBlockData = (blockData.results || [])
            .map(block => {
                try {
                    let mdConvert = '';
                    let mdText = '';

                    if (!block || !block.type) return '';

                    const blockContent = block[block.type];
                    if (!blockContent) return '';

                    switch(block.type) {
                        case 'heading_1':
                            mdConvert = '#';
                            mdText = blockContent?.text?.[0]?.text?.content || '';
                            break;
                        case 'heading_2':
                            mdConvert = '##';
                            mdText = blockContent?.text?.[0]?.text?.content || '';
                            break;
                        case 'heading_3':
                            mdConvert = '###';
                            mdText = blockContent?.text?.[0]?.text?.content || '';
                            break;
                        case 'bulleted_list_item':
                            mdConvert = '- ';
                            mdText = blockContent?.text?.[0]?.text?.content || '';
                            break;
                        case 'paragraph':
                            mdConvert = '';
                            mdText = blockContent?.text?.[0]?.text?.content || '';
                            break;
                        case 'image':
                            mdConvert = '';
                            mdText = `![post block related](${blockContent?.file?.url || ''})`;
                            break;
                        default:
                            mdConvert = '';
                            mdText = blockContent?.text?.[0]?.text?.content || '';
                            break;
                    }

                    return mdConvert && mdText ? `${mdConvert} ${mdText}` : mdText;
                } catch (error) {
                    console.warn('Error mapping block:', error.message);
                    return '';
                }
            })
            .filter(text => text.length > 0)
            .join('\n');

            return {
                ...result,
                block: mappedBlockData
            };
        }));

        return {
            posts: finalResult
        };
    } catch (error) {
        console.error("Error in notion data module:", error);
        return {
            posts: []
        };
    }
};