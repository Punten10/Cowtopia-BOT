const axios = require('axios');
const fs = require('fs');
const readline = require('readline');

// Function to sanitize X-Tg-Data
function sanitizeHeader(header) {
    return header.trim().replace(/[\r\n]+/g, '');
}

// Function to dynamically import chalk
async function importChalk() {
    const chalkModule = await import('chalk');
    return chalkModule.default;
}

// Function to generate token
async function generateToken(x_tg_data) {
    const chalk = await importChalk();
    const sanitized_tg_data = sanitizeHeader(x_tg_data);
    
    const url = "https://cowtopia-be.tonfarmer.com/auth";
    const headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Origin": "https://cowtopia-prod.tonfarmer.com",
        "Referer": "https://cowtopia-prod.tonfarmer.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
        "X-Chain-Id": "43113",
        "X-Lang": "en",
        "X-Os": "miniapp",
        "X-Tg-Data": sanitized_tg_data
    };

    try {
        const response = await axios.post(url, {}, { headers, timeout: 10000 });
        if (response.status === 201) {
            const data = response.data.data;
            console.log(`[ ${currentTime()} ] Token generated successfully:`);
            console.log(`[ ${currentTime()} ] Username    : ` + chalk.greenBright(`${data.user.username}`));
            console.log(`[ ${currentTime()} ] Level       : ` + chalk.greenBright(`${data.user.level}`));
            console.log(`[ ${currentTime()} ] Cow Balance : ` + chalk.greenBright(`${data.user.token}`));
            console.log(`[ ${currentTime()} ] Money       : ` + chalk.greenBright(`${data.user.money}`));
            return { token: data.access_token, user: data.user };
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Token generation failed. Status code: ${response.status}`));
            return null;
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] ` + chalk.red(`Error generating token: ${error.message}`));
        return null;
    }
}

// Function to fetch available missions based on group
async function fetchMissions(token, group) {
    const chalk = await importChalk();
    const API_MISSIONS = `https://cowtopia-be.tonfarmer.com/mission?group=${group}`;

    try {
        const response = await axios.get(API_MISSIONS, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.data.success) {
            return response.data.data.missions;
        } else {
            return null;
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] ` + chalk.red(`Error fetching missions for group "${group}": ${error.message}`));
        return null;
    }
}

// Update the completeMissions function to include group checks
async function completeMissions(token) {
    const chalk = await importChalk();
    const groups = ['main', 'partner']; // Define the groups

    for (const group of groups) {
        const missions = await fetchMissions(token, group);

        if (!missions) continue;

        for (const mission of missions) {
            const data_mission = {
                mission_key: mission.key
            };

            try {
                const url = "https://cowtopia-be.tonfarmer.com/mission/check";
                const headers = {
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Origin": "https://cowtopia-prod.tonfarmer.com",
                    "Referer": "https://cowtopia-prod.tonfarmer.com/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
                    "X-Chain-Id": "43113",
                    "X-Lang": "en",
                    "X-Os": "miniapp"
                };

                const response = await axios.post(url, data_mission, { headers, timeout: 10000 });
                if (response.data.success) {
                    if (response.data.data.completed) {
                        console.log(`[ ${currentTime()} ] ` + chalk.green(`Mission: ${mission.name} | Status: Completed`));
                    } else {
                        console.log(`[ ${currentTime()} ] ` + chalk.red(`Mission: ${mission.name} | Status: Not Completed`));
                    }
                } else {
                    console.log(`[ ${currentTime()} ] ` + chalk.red(`Mission: ${mission.name} | Status: Failed`));
                }
            } catch (error) {
                console.log(`[ ${currentTime()} ] ` + chalk.red(`Error completing mission "${mission.name}" for group "${group}": ${error.message}`));
            }
        }
    }
}

// Function to buy an animal
async function buyAnimal(token) {
    const chalk = await importChalk();
    const API_GAME_INFO = "https://cowtopia-be.tonfarmer.com/user/game-info?";
    const API_BUY_ANIMAL = "https://cowtopia-be.tonfarmer.com/factory/buy-animal";

    try {
        const res = await axios.get(API_GAME_INFO, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const factories = res.data.data.factories;
        const factoriesIsAvailable = factories.filter(
            (factory) => factory.animal_count < 5 && factory.lock === false
        );
        const money = res.data.data.user.money;

        if (factoriesIsAvailable.length > 0) {
            let autoBuy = true;
            let purchaseCounter = factoriesIsAvailable[0].animal_count;
            const maxPurchases = 5;
            while (autoBuy) {
                if (purchaseCounter >= maxPurchases) {
                    autoBuy = false;
                    console.log(`[ ${currentTime()} ] ` + chalk.magenta(`Maximum purchases animal reached.`));
                    await buyLand(token);
                } else if (money >= factoriesIsAvailable[0].animal_cost) {
                    const res = await axios.post(
                        API_BUY_ANIMAL,
                        {
                            factory_id: factoriesIsAvailable[0].factory_id,
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            }
                        }
                    );

                    console.log(`[ ${currentTime()} ] Animal purchased successfully: ` + chalk.greenBright(`${JSON.stringify(res.data.data)}`));
                    purchaseCounter++;
                } else {
                    console.log(`[ ${currentTime()} ] ` + chalk.red(`Money not enough to buy animal`));
                    autoBuy = false;
                }
            }
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.yellow(`No factories available`));
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] ` + chalk.red(`Error from buy animal: ${error.message}`));
    }
}

// Function to buy land
async function buyLand(token) {
    const chalk = await importChalk();
    const API_GAME_INFO = "https://cowtopia-be.tonfarmer.com/user/game-info?";
    const API_BUY_FACTORY = "https://cowtopia-be.tonfarmer.com/factory/buy";

    try {
        const res = await axios.get(API_GAME_INFO, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const factories = res.data.data.factories;
        const factoriesIsAvailable = factories.filter(
            (factory) => factory.lock === true
        );

        const money = res.data.data.user.money;

        if (factoriesIsAvailable.length > 0 && money >= factoriesIsAvailable[0].unlockCost) {
            await axios.post(
                API_BUY_FACTORY,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            console.log(`[ ${currentTime()} ] ` + chalk.greenBright(`Factory unlocked`));
        } else {
            console.log(`[ ${currentTime()} ]  ` + chalk.red(`Money Not enough to unlock factory`));
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] Unlock factory failed: ${error.message}`);
    }
}

// Function to upgrade house
async function upgradeHouse(token) {
    const chalk = await importChalk();
    const API_UPGRADE_HOUSE_GET = "https://cowtopia-be.tonfarmer.com/factory/upgrade-house?";
    const API_UPGRADE_HOUSE_POST = "https://cowtopia-be.tonfarmer.com/factory/upgrade-house";

    try {
        const getResponse = await axios.get(API_UPGRADE_HOUSE_GET, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (getResponse.data.success) {
            const currentLevel = getResponse.data.data.level; // Simulated level check
            console.log(`[ ${currentTime()} ] Current factory house level: ${currentLevel}`);
            if (currentLevel < 20) { // Replace 4 with the desired maximum level
                const postResponse = await axios.post(API_UPGRADE_HOUSE_POST, {}, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (postResponse.status === 200 && postResponse.data.success) {
                    console.log(`[ ${currentTime()} ] ` + chalk.green(`Upgrade factory house success.`));
                } else {
                    console.log(`[ ${currentTime()} ] ` + chalk.red(`Upgrade factory house failed.`));
                }
            } else {
                console.log(`[ ${currentTime()} ] ` + chalk.blue(`Factory house is already at maximum level.`));
            }
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Pre-check for upgrade factory house failed.`));
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] ` + chalk.red(`Error upgrading factory house: ${error.message}`));
    }
}

// Function to get NFT box info
async function getNftBoxInfo(token) {
    const chalk = await importChalk();
    const API_NFT_BOX_INFO = "https://cowtopia-be.tonfarmer.com/nft/box/info?";

    try {
        const response = await axios.get(API_NFT_BOX_INFO, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.data.success) {
            console.log(`[ ${currentTime()} ] NFT Box Info: ` + chalk.greenBright(`${JSON.stringify(response.data.data)}`));
            return response.data.data;
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Failed to get NFT box info.`));
            return null;
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] ` + chalk.red(`Error getting NFT box info: ${error.message}`));
        return null;
    }
}

// Function to open NFT box
async function openNftBox(token) {
    const chalk = await importChalk();
    const API_NFT_BOX_OPEN = "https://cowtopia-be.tonfarmer.com/nft/box/open";

    const payload = {
        currency: "money"
    };

    try {
        const response = await axios.post(API_NFT_BOX_OPEN, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.data.success) {
            console.log(`[ ${currentTime()} ] NFT Box opened successfully: ` + chalk.greenBright(`${JSON.stringify(response.data.data)}`));
            console.log(`[ ${currentTime()} ] NFT Title: ` + chalk.greenBright(`${response.data.data.title}`));
            return response.data.data;
        } else if (response.data.error && response.data.error.code === 400) {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Not enough Coin`));
            return null;
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Failed to open NFT box.`));
            return null;
        }
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Failed to open NFT box, Not enough Coin`));
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Error opening NFT box: ${error.message}`));
        }
        return null;
    }
}


// Function to fetch NFT list
async function fetchNftList(token) {
    const chalk = await importChalk();
    const API_NFT_LIST = "https://cowtopia-be.tonfarmer.com/nft/list?limit=20&offset=0";

    try {
        const response = await axios.get(API_NFT_LIST, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.data.success) {
            const nftList = response.data.data.map(nft => nft.nft_id);
            console.log(`[ ${currentTime()} ] NFT List fetched successfully: ` + chalk.greenBright(`${JSON.stringify(nftList)}`));
            return nftList;
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Failed to fetch NFT list.`));
            return null;
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] ` + chalk.red(`Error fetching NFT list: ${error.message}`));
        return null;
    }
}

// Function to equip a single NFT to each factory, skipping those where an NFT is already equipped
async function equipNftToAllFactories(token) {
    const chalk = await importChalk();
    const API_GAME_INFO = "https://cowtopia-be.tonfarmer.com/user/game-info?";
    const API_EQUIP_NFT = "https://cowtopia-be.tonfarmer.com/factory/equip-nft";

    try {
        // Fetch all factories and their NFT status
        const res = await axios.get(API_GAME_INFO, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const factories = res.data.data.factories;

        // Fetch the list of NFTs
        const nftList = await fetchNftList(token);

        if (factories.length > 0 && nftList && nftList.length > 0) {
            let nftIndex = 0;

            for (const factory of factories) {
                // Check if the factory already has an NFT equipped
                if (factory.nft_id) {
                    console.log(`[ ${currentTime()} ] ` + chalk.yellow(`Factory ID: ${factory.factory_id} already has NFT ID: ${factory.nft_id}. Skipping to next factory.`));
                    continue; // Skip this factory since it already has an NFT
                }

                const nftId = nftList[nftIndex];
                const payload = {
                    factory_id: factory.factory_id,
                    nft_id: nftId
                };

                try {
                    const response = await axios.post(API_EQUIP_NFT, payload, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (response.data.success) {
                        console.log(`[ ${currentTime()} ] ` + chalk.greenBright(`NFT ${nftId} equipped successfully on Factory ID: ${factory.factory_id}`));
                        nftIndex++; // Move to the next NFT only after a successful equip
                    } else {
                        console.log(`[ ${currentTime()} ] ` + chalk.red(`Failed to equip NFT ${nftId} on Factory ID: ${factory.factory_id}. Message: ${response.data.message}`));
                    }
                } catch (error) {
                    console.log(`[ ${currentTime()} ] ` + chalk.red(`Error equipping NFT ${nftId} on Factory ID: ${factory.factory_id}: ${error.message}`));
                }

                // Check if all NFTs have been used, if so, break the loop
                if (nftIndex >= nftList.length) {
                    console.log(`[ ${currentTime()} ] ` + chalk.yellow(`All NFTs have been used. Exiting.`));
                    break;
                }
            }
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.yellow(`No factories or NFTs available to equip.`));
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] ` + chalk.red(`Error fetching factory or NFT information: ${error.message}`));
    }
}

// Function to claim offline profit
async function claimOfflineProfit(token) {
    const chalk = await importChalk();
    const url = "https://cowtopia-be.tonfarmer.com/user/claim-offline-profit";
    const headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Origin": "https://cowtopia-prod.tonfarmer.com",
        "Referer": "https://cowtopia-prod.tonfarmer.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
        "X-Chain-Id": "43113",
        "X-Lang": "en",
        "X-Os": "miniapp"
    };
    const payload = {
        "boost": false
    };

    try {
        const response = await axios.post(url, payload, { headers, timeout: 10000 });
        if (response.status === 201) {
            const data = response.data.data;
            console.log(`[ ${currentTime()} ] Offline profit successfully claimed: ` + chalk.greenBright(`${data.profit}`));
        } else {
            console.log(`[ ${currentTime()} ] ` + chalk.red(`Offline profit claim failed. Status code: ${response.status}`));
        }
    } catch (error) {
        console.log(`[ ${currentTime()} ] ` + chalk.red(`Error claiming offline profit or already claimed`));
    }
}

// Helper function to wait for a given duration
async function wait(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
}

// Helper function to format time
function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${hours}:${minutes}:${secs}`;
}

const currentTime = () => {
    const now = new Date();
    return now.getHours().toString().padStart(2, "0") + ":" +
        now.getMinutes().toString().padStart(2, "0") + ", " +
        now.getDate().toString().padStart(2, "0") + "/" +
        (now.getMonth() + 1).toString().padStart(2, "0") + "/" +
        now.getFullYear();
};

// Modified countdown timer
async function countdownTimer(duration) {
    const chalk = await importChalk();
    let remainingTime = duration;
    const frames = ["𓃉𓃉𓃉", "𓃉𓃉∘", "𓃉∘°", "∘°∘", "°∘𓃉", "∘𓃉𓃉"];
    let frameIndex = 0;
    while (remainingTime > 0) {
        process.stdout.write(`\r` + chalk.cyan(`[ ${frames[frameIndex]} ] Countdown: ${formatTime(remainingTime)}`));
        await wait(80);
        remainingTime -= 80;
        frameIndex = (frameIndex + 1) % frames.length;
    }
    process.stdout.write(`\r` + chalk.cyan("[ ∘∘∘ ] Countdown: 00:00:00\n"));
}

// Modified main function
async function main() {
    const chalk = await importChalk();
    
    const delay = await new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question("Input delay in seconds: ", answer => {
            rl.close();
            resolve(parseInt(answer, 10));
        });
    });

    const autoClearMission = await new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question("Auto Clear Mission (Y or N) (Default N): ", answer => {
            rl.close();
            resolve(answer.trim().toUpperCase() === 'Y');
        });
    });

    const autoBuyAnimal = await new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question("Auto Buy Animal (Y or N) (Default N): ", answer => {
            rl.close();
            resolve(answer.trim().toUpperCase() === 'Y');
        });
    });

    const autoBuyFactory = await new Promise(resolve => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question("Auto Buy Factory (Y or N) (Default N): ", answer => {
            rl.close();
            resolve(answer.trim().toUpperCase() === 'Y');
        });
    });

    console.log(`\n`);
    console.log(chalk.whiteBright('      ____              _____           _       '));
    console.log(chalk.whiteBright('     / ___|_____      _|_   _|__  _ __ (_) __ _ '));
    console.log(chalk.whiteBright('    | |   / _ \\ \\ /\\ / / | |/ _ \\| \'_ \\| |/ _` |'));
    console.log(chalk.whiteBright('    | |__| (_) \\ V  V /  | | (_) | |_) | | (_| |'));
    console.log(chalk.whiteBright('     \\____\\___/ \\_/\\_/   |_|\\___/| .__/|_|\\__,_|'));
    console.log(chalk.whiteBright('                                 |_|            '));
    console.log(chalk.whiteBright('    +--------------------------+'));
    console.log(chalk.whiteBright('    ¦ By ZUIRE AKA Aureola     ¦'));
    console.log(chalk.whiteBright('    +--------------------------+'));
    console.log(`\n`);

    while (true) {
        const tgDataList = fs.readFileSync('query.txt', 'utf8').split('\n').filter(line => line.trim() !== '');

        for (const tgData of tgDataList) {
            const tokenData = await generateToken(tgData);
            if (tokenData) {
                const { token, user } = tokenData;
                console.log(`[ ${currentTime()} ] Starting actions for user: ` + chalk.greenBright(`${user.username}`));
                
                if (autoClearMission) {
                    await completeMissions(token);
                }
                if (autoBuyAnimal) {
                    await buyAnimal(token);
                }
                if (autoBuyFactory) {
                    await buyLand(token);
                }
                await upgradeHouse(token);

                const nftBoxInfo = await getNftBoxInfo(token);
                let factoryId = null;
                if (nftBoxInfo) {
                    const nftBoxData = await openNftBox(token);
                    if (nftBoxData) {
                        factoryId = nftBoxData.factory_id;
                        await equipNft(token, nftBoxData.factory_id, nftBoxData.nft_id);
                    }
                }

                await equipNftToAllFactories(token); // Equip NFTs to all factories

                await claimOfflineProfit(token);
                console.log(`[ ${currentTime()} ] Finished actions for user: ` + chalk.greenBright(`${user.username}\n`));
            }
        }

        console.log(`[ ${currentTime()} ] Waiting for the next iteration...\n`);
        await countdownTimer(delay * 1000);
    }
}

main().catch(console.error);
