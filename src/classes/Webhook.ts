import SKU from '@tf2autobot/tf2-sku';
import SchemaManager from '@tf2autobot/tf2-schema';
import Currencies from '@tf2autobot/tf2-currencies';
import { XMLHttpRequest } from 'xmlhttprequest-ts';
import { Item } from './IPricer';
import PricesTfPricer from '../lib/pricer/pricestf/prices-tf-pricer';
import { GetItemPriceResponse } from './IPricer';
import log from '../lib/logger';

const priceUpdateWebhookURLs = JSON.parse(process.env.MAIN_WEBHOOK_URL) as string[];

const keyPriceWebhookURLs = JSON.parse(process.env.KEYPRICE_WEBHOOK_URL) as string[];
const KeyPriceRoleIDs = JSON.parse(process.env.KEYPRICE_ROLE_ID) as string[];

const webhookDisplayName = process.env.DISPLAY_NAME;
const webhookAvatarURL = process.env.AVATAR_URL;
const webhookNote = process.env.NOTE;

const botVersion = process.env.BOT_VERSION;

interface Currency {
    keys: number;
    metal: number;
}

interface Prices {
    buy: Currency;
    sell: Currency;
}

export interface EntryData {
    sku: string;
    buy?: Currency | null;
    sell?: Currency | null;
    time?: number | null;
}

export class Entry implements EntryData {
    sku: string;

    buy: Currencies | null;

    sell: Currencies | null;

    time: number | null;

    private constructor(entry: EntryData) {
        this.sku = entry.sku;
        this.buy = new Currencies(entry.buy);
        this.sell = new Currencies(entry.sell);
        this.time = entry.time;
    }

    static fromData(data: EntryData): Entry {
        return new Entry(data);
    }

    getJSON(): EntryData {
        return {
            sku: this.sku,
            buy: this.buy === null ? null : this.buy.toJSON(),
            sell: this.sell === null ? null : this.sell.toJSON(),
            time: this.time
        };
    }
}

export interface PricesObject {
    [id: string]: Entry;
}

export interface PricesDataObject {
    [id: string]: EntryData;
}

export interface KeyPrices {
    buy: Currencies;
    sell: Currencies;
    time: number;
}

const australiumImageURL: { [defindex: number]: string } = {
    // Australium Ambassador
    61: 'IUwYcXxrxqzlHh9rZCv2ADN8Mmsgy4N4MgGBvxVQuY7G2ZW8zJlfDUKJYCqxp8lnuW34wvJM3DIHgr-8CcAu9qsKYZG08QCvM/',
    // Australium Medi Gun
    211: 'cUwoUWRLlrTZ8j8fqCc2ACfIHnpQ35pFWgGVtkFEqMuawNTQ-IwaaVfgICfRs9Vm9UXdmvpcwV4TipO4CZ0yx42dGigAL/',
    // Australium SMG
    203: 'IUxQcWiTltzRHt8TnH_WJRrhXmYpmvchRimI4xlMtbOfmNGdhdlTGV_VdDqBjrV-9CH43uZMzV4f457UBxvSrc7I/',
    // Australium Stickybomb Launcher
    207: 'cUxQFVBjpoTpMhcrZAfOZBuMInsgK4p9Z3QlnkBN8Ma2xNGBldwbGBfQHCqNj9Vy-UXJm6sVmVYS0oLlWeFm9soqSYbd_N4tEAYCODYMwr6jb/',
    // Australium Black Box
    228: 'IUwUdXBjpujdbt8_pAfazBOESnN97tJUAiGc6wFl4ZbvjaDU0JFbGUvUJCPc-8QvqDXc36pI6V4_go-oCexKv6tWDpsnI5Q/',
    // Australium Blutsauger
    36: 'IUwsUWBjqvy1Nt8_pAfazBOESnN97vZQFgGVtyQUrbeW2ZjM_IFHGA_JYC_BuoQ7qDyJlusVnUdO1orpQfRKv6tW-OVvZVQ/',
    // Australium Flame Thrower
    208: 'IUwEdXBbnrDBRh9_jH82LB-wEpNY095dQl2AzwlAsY7GzY242JlbHUKRdD6JtrV_pCndhvcJgDI7jpe8Afgrq54LYc-5723D3DXU/',
    // Australium Force-A-Nature
    45: 'IUwMeSBnuvQdBidr0CP6zD-8Mn-U55IJS3Hg4xFB_NbSzYjJkcwCRUaFaCaJopVzuWHBi65dnAILu8u9Te1--t9DCLfByZ9DzsRlF/',
    // Australium Frontier Justice
    141: 'IUwEDUhX2sT1Rgt31GfuPDd8HlNYx2pxUyzFu31V6YrLiZWJiIVeUV6IKDvdi9wy-UXA3upY3VtG19eMDeAzusYLOMrcycIYb30r634E/',
    // Australium Grenade Launcher
    206: 'cUwADWBXjvD1Pid3oDvqJGt8HlNYx2pxUyzFu31YtYObgYGFjJ12VBKYLDac78FC5WyYxvMU1DYC0pLpTcAq8sIOVNrEycIYbGbNsLhA/',
    // Australium Minigun
    202: 'cUwoYUxLlrTZ8j8fqCc2ACfIHnpRl48RRjjczw1N_YuLmYjVhJwaSUvILCa1r8Fm5X3cwupFnAoXvob8DZ0yx4_oW5y4u/',
    // Australium Tomislav
    424: 'IUxMeUBLxtDlVt8_pAfazBOESnN974chX2mQ9wQMrY-G3YGdhcwWXB_UPWKZt9wruUX9ivpFlAIWwou1VehKv6tXcWH-bzQ/',
    // Australium Rocket Launcher
    205: 'cUxUeXhDnrDRCncblBfeeN-cPl94K6ZFH3jMlwgcsNeaxZDYwcQWbA_BbDvZprArqXSJluJ5hUYPur-xRKlnq4daUO65sbo8Wbc6SlA/',
    // Australium Scattergun
    200: 'cUxQSXA_2vSpEncbZCv2ADN8Mmsgy4N4E2Gc-lQcsMuDlY2A2IQbHB6UGWK0-9V29WnY365E3BYTkpb1UewzqqsKYZAHhHABV/',
    // Australium Sniper Rifle
    201: 'cUxQfVAvnqipKjsTjMvWDBOQ_l9sn4pUbiGI6wFUoYLftMjMzcFeQBPFYD6dsoF-_Wn9nvJ82B4fkpOgAelrq5ZyGbefBeMmAbQ/',
    // Australium Sniper Rifle 2 - weird
    15072: 'cUxQfVAvnqipKjsTjMvWDBOQ_l9sn4pUbiGI6wFUoYLftMjMzcFeQBPFYD6dsoF-_Wn9nvJ82B4fkpOgAelrq5ZyGbefBeMmAbQ/',
    // Australium Axtinguisher
    38: 'IUwYJSRLsvy1Km8DjH82cEfIPpN066ZRq1Td5lgQ1MrDhZmAyKgfHU_cLX6NtrAy8W3Bnup4zVdPur-heew3otoTCZ7R_ZcYMQZeUvB7w1w/',
    // Australium Eyelander
    132: 'IUwQdXALvtypGt8_pAfazBOESnN974ZFWjW8ylVJ_Y-C3aWEyKwGbUvUHWaRpo1--CHE2vsRmUITh9bhWehKv6tX00uGxPA/',
    // Australium Knife
    194: 'cUwwfVB3nhz9MhMzZAfOeD-VOyIJs55YAjDA8wAd6NrHnMm4xcFKSU_ZcCPQ49QzoXXQ0vcUxAYDu8vUWJ1teRmVbCw/',
    // Australium Wrench
    197: 'cUxADWBXhsAdEh8TiMv6NGucF1Ypg4ZNWgG9qyAB5YOfjaTRmJweaB_cPCaNjpAq9CnVgvZI1UNTn8bhIOVK4UnPgIXo/'
};

const paintCan: { [defindex: number]: string } = {
    // A Color Similar to Slate
    5052: 'TbL_ROFcpnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvOvr1MdQ/',
    // A Deep Commitment to Purple
    5031: 'TeLfQYFp1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvVs13Vys/',
    // A Distinctive Lack of Hue
    5040: 'TYffEcEJhnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvXrHVMg0/',
    // A Mann's Mint
    5076: 'SLKqRMQ59nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvU8z3W20/',
    // After Eight
    5077: 'TbLfJME5hnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvWdo-dtk/',
    // Aged Moustache Grey
    5038: 'TeLPdNFslnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvFkHADQU/',
    // An Air of Debonair
    5063: 'TffPQfFZxnqWSMU5OD2NsHx3oIzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V0p8gFQg/',
    // An Extraordinary Abundance of Tinge
    5039: 'SMf6UeRJpnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv64ewDK8/',
    // Australium Gold
    5037: 'SMfqIdEs5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvsjysS5w/',
    // Balaclavas Are Forever
    5062: 'TaK_FOE59nqWSMU5OD2NgHxnAPzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V3lcfHzA/',
    // Color No. 216-190-216
    5030: 'SNcaJNRZRnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvFOcRWGY/',
    // Cream Spirit
    5065: 'SKevZLE8hnqWSMU5OD2IsHzHMPnShGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VQmu5hdU/',
    // Dark Salmon Injustice
    5056: 'SMcPkeFs1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvy3dkty0/',
    // Drably Olive
    5053: 'TRefgYEZxnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvMuQVCSQ/',
    // Indubitably Green
    5027: 'Tee_lNFZ5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvm153-6I/',
    // Mann Co. Orange
    5032: 'SKL_cbEppnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvTFGBHn4/',
    // Muskelmannbraun
    5033: 'SIfPcdFZlnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvcmoesjg/',
    // Noble Hatter's Violet
    5029: 'TcePMQFc1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvgXmHfsU/',
    // Operator's Overalls
    5060: 'TdcfMQEpRnqWSMU5OD2NoHwHEIkChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8V-hQN5Nc/',
    // Peculiarly Drab Tincture
    5034: 'SKfKFOGJ1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvG7gZwMo/',
    // Pink as Hell
    5051: 'SPL_YRQ5hnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv9O7ytVg/',
    // Radigan Conagher Brown
    5035: 'TfcPRMEs1nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgv4OlkQfA/',
    // Team Spirit
    5046: 'SLcfMQEs5nqWSMU5OD2NwHzHZdmihGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VWwsKTpY/',
    // The Bitter Taste of Defeat and Lime
    5054: 'Tae6NMEp5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvvmRKa6k/',
    // The Color of a Gentlemann's Business Pants
    5055: 'SPeaUeGc9nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvoDEBbxU/',
    // The Value of Teamwork
    5064: 'TRefMYE5xnqWSMU5OD2NsKwicEzChGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8Vs4Ux0YY/',
    // Waterlogged Lab Coat
    5061: 'SIcflJGc9nqWSMU5OD2NEMzSVdmyhGKyv2yXdsa7g9fsrW0Az__LbZTDL-ZTCZJiLWEk0nCeYPaCiIp23hirHFAG-cX714QglReKMAoGJKO5qBPxRogIVe_DO5xxB4TBB6dJNEKVrtnidHNeVr2C8VT2CQ46M/',
    // Ye Olde Rustic Colour
    5036: 'TeKvZLFJtnqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvmeRW1Z8/',
    // Zepheniah's Greed
    5028: 'Tde_ROEs5nqWSMU5PShIcCxWVd2H5fLn-siSQrbOhrZcLFzwvo7vKMFXrjazbKEC3YDlltU7ILYTmKrTT3t-mdE2nBQewrRwpRKfEHoGxPOM3aPhM8045d-zTgwxczDhgvPiWjbeE/'
};

const paintCans = Object.keys(paintCan);

const ks1Images: { [target: number]: string } = {
    // Killstreak Kit (6527)
    // Kritzkrieg (5749)
    35: 'y1FZPCfq1XFsaeB-B8fH0gL-7-OISHauPTOUeiDYRQ1qTOBaN2vZ_jSt5eWVEGnKQu0rRwwFfqIE92xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFmn22oo8',
    // Blutsauger
    36: 'y1FaLyf71XN4a9pgOdnBxUv5ouHaTS31bmDCd3iBH1g_SeINMj6Ir2H3sbiTE2rJQ-4oR1sHe_AF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pfJry0Kb',
    // Ubersaw (5730)
    37: 'y1FDKCfqznV6WultKszDjgSsp7GMSy30OjPHfSeLT1g4GLZeM2iL_TTx4OWVETmfQb0lFw8BfvQasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxgs8gevo',
    // Axtinguisher (5733)
    38: 'y1FXMjbx03N4bPZkPdn50Bzprt2BHWbwbXnHeXbfGQ0wSOdfZDnc_mWssb-cED7JQeksQwgNevFXpm1PbMqANhA_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrc_Gk0VEoYiNCvWAeexynfOWOaxOuhf7ZNXBlgTGUe-yXx6Dxx44fHfPAtH4X9y-6KV-8W20JWxGLBGOePO',
    // Flare Gun (5793)
    39: 'y1FQJiPq2HN4a9p8IdnJ_wn6s-WIUnGhPmSVfXSNGgo6TLNZY2iP_Tuk4r_AQTrISO8tFw0CfPRWoGUbbsyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pns1DBc9Q',
    // Backburner (5747)
    40: 'y1FUKyHz32F_a-B-B8fH0gL-77SIGCDyOG6VfHGJSVwwGbdWN26I9zun4-rHSzGcSespRVhQf_MGpmFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFKUvrF8Q',
    // Natascha
    41: 'y1FBFS7t2XlkaeRTNMrUxwC187aLS3WibGWdfHbaRVxrHrpdNWqMrGL37b-QR2vPEroqFQ4HLKtR8HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPVNx04ibA',
    // Killing Gloves of Boxing
    43: 'y1FUJTrx03NSYuljLs7V_wn6s-WIUnegaW6TdniBGVhsSrNaMWDc-TDw5rnARmufROl5R18GL6FX8WAdacCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnBTxCUU4',
    // Sandman
    44: 'y1FBJS382HpSZ-R4B8fH0gL-77aMHS2nMTOWKXPfS1xqGLQLYTnZ-TLx4u-cRmvNEuouEV9XdaZQ8jJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFpUeECuM',
    // Force-A-Nature
    45: 'y1FSJTf60XFSZ-R-Ks7K_wn6s-WIUi32amScLniNTlpuH7dWPW7b9meltunAEDCbQb0pSl9ReKVWozVMbJyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnJiCmFyc',
    // Huntsman (5746)
    56: 'y1FUJTXH0XV_YuAiapvFkFKq87TaGCajOWWceiCOTw08TbddNj6M_2WhtL6SQzvMFO1-FRdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFroLjUFxA',
    // Ambassador (5750)
    61: 'y1FXJyD5zmdsYep-B8TW1Dr3oPCKGTrzOjXALXSNSAtqRbFaNGvdrDDw4-vBFzjPQewpRgxSfqsBpzUaNM6AIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umb3fCrnh',
    // Direct Hit (5745)
    127: 'y1FSIzD93mBlbPFTNMrUxwC18rOJS3GhOWfHK3fdRVw5TuBeYT7f-Tf34buXRjybQOkvQAkHf6ED9noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPV8HUCLQA',
    // Equalizer
    128: 'y1FGIyHz3GxoWvY-B8fH0gL-77vbH3LyOmaWKSWPHwlpH-FXMGGM-2Wj5urGQTydE-h4Rl8NfqVRo2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFGkLoPk0',
    // Scottish Resistance
    130: '31FFPiv71m1vauhuB8_DxgD1peefI3j2ejDBYXTcHg08RLBfPGqK_DSt57idEzjKSLp_FVxSLqsMoWEbaJuJPENv3YAVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFwdArAtCjXQFq6y3SiRV7W0OuIM7JdYBV5LS0buk3cpB0gpvajQYgsWtnl38_abr8rkxtPxDx5wqj9qHPE',
    // Chargin' Targe
    131: 'y1FCKzD_2EthZPdrPYWexFf58ObbTnCnbWOXLnKJT1puReVbNW_Yqzf04uyUF2ybRbt6F18AY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6I8yoxPuKH-uh9EbsY7QgcaR-x9YGDXXKvgkn-RDeuxbekI5ZQBXlEcHEm6ynUvBkkuvPHfdE0e5_1E7L65',
    // Eyelander
    132: 'y1FVJiPh0Ht_YNpgOdnBxUus8LGPSiKgOGSUenmJRAg9RLNfYGyI-Gbw5evGS27BSbt-Q1gEKKsF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pWTRBhcA',
    // Frontier Justice (5751)
    141: 'y1FQOC32yX1od-95K9_PwwDEreOfG3G5am6SfSOJTFw5TecLZ2HYqjGk4-XBQGvIFOwvEV9QeaJV8mZKO8vabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIJD1o8COg',
    // Gunslinger
    142: 'z3tYOS7x03Nod9pgOdnBxUuvpOaISyfyO2XHfHaKSlxuTeIINWyLqmb04u_CQD7BQuEuQlpQKfYF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pcIhyEK7',
    // Homewrecker
    153: 'y1FFJif82nFlZOhhPdn5zATppufDHiKmP2CXKnGMGA09ReIKNm7c_Tui7OuXFmqaQL4oSglXfvMGoDFJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZodG4-FDg',
    // Pain Train
    154: 'y1FGKyv2yWZsbOtTNMrUxwC1pbXYSnfzMG6cdnOIHgo_GLdcNWuKr2WjtruSQmqdQrkkQQwNf_QF8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPWQxQxUug',
    // Southern Hospitality
    155: 'y1FFOivz2GN_YOtvMPTKwRf8pKzZRCXxOW_AKXSOGQc-TbAPNDnd_jb0s-uSETvJQ7ouEV1WK6tVp2IbI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-MvpftOl',
    // Lugermorph
    160: 'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-LK8U4cr',
    // Lugermorph (second one?)
    294: 'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-LK8U4cr',
    // Big Kill
    161: 'y1FCPiXHznVgWuJ5NvTKwRf8pKzfSCOuOmPCfSCMGlwxG7ALMmyK_TLx5-qSSj_JFLwoEV1Qe_cM9TFPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-O642yZB',
    // Tribalman's Shiv
    171: 'y1FBJS384nlsZu1pLM75zATppufDSXGua2OTKyXbTgY_TbFbYW_d_jPw5u_BRTrBQOF6F1sMLqBV8GBBaNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zow4KqSCg',
    // Scotsman's Skullcutter
    172: 'y1FUKzbs0XFsfeBTNMrUxwC19LvYS3euMTGdfnjcHVg_TuVaY2yIrDXz5uyXF23IE74kFQ4GfaVRoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPWkg4ccQg',
    // Vita-Saw
    173: 'y1FDKCfq03FoYelpB8fH0gL-77XVHyX0PG7CdiOKHVtqG7cKM2mK_2Gt4-_BEz-dEOp_Q1gGf6sE-2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFbL_2cXA',
    // Bat
    190: 'y1FUKzbH0XV_YuAiPJuVlgf-87HYTHGjP2DAKyOKTAs_S-FaNDrR_WKj4-uTETjLE-gkERdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFpjY4Lghg',
    // Bottle
    191: '31FUJTbs0XFSaeR-P86IlFH99LWOGCLyMTKcLHiORAxqTrZfNWDe_mb35u2SRGzISL4kQg0GdbxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imuNH7pRg',
    // Fire Axe
    192: 'y1FQIzD93GxoWvV1KsT5zATppufDHnGgMG-UfiTdRFpuSucNYWndq2Gt7LiUFm2fQ-8uRwkMfaMG8mFINNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZqvRkMNkQ',
    // Kukri
    193: '31FbKyHw2GBoWultKszDjgT5-LLcSSCvODSRLXXaGFhpT-JWM23e-TSg7bnCRm2bQbsqFQwCffYasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxOS3bjIk',
    // Knife
    194: '31FdJCv-2EthZPdrPYWUkgf6-OOLGSHzOmWSeSWKGAdpG7MIMjyKqDqsseuTFj3BSbt-SwABY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6I8yoxPuKH-uh9EbsY7QgcaR-x9YGDXXKvgkn-RDeuxbekI5ZQBXlEcHEm6ynUvBkkuvPHfdE0e55_tEmtj',
    // Fists
    195: '3lFQIzHs4nxoZPN1B8fH0gL-77qMTXGka2PHfiKBTFtrSLFWPTrY_Tui5r-WRD2cSe4vEAsEL6MH-mNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFo5NPN6M',
    // Shovel
    196: '31FFIi3u2HhSaeR-P86IxVKs97bcGXHzOzSXfnndRAk8RLpZM27e92GksOiWQmnIFegtEgkDf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7ikXgBdeIg',
    // Wrench (5794)
    197: '31FBOCf23nxSaeR-P86IkFL-8uSPRXajPWfGd3aKTwo5TLNYPGrZ_DGns-2cRW7LFb5_RF0Fe7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imZ_hPyfQ',
    // Bonesaw
    198: 'y1FUJSz9znV6WultKszDjgT-p-OJSiWgPWCUeHffSgw-ReELMTzY-2KhtO6QS2yfFO8tEVgAdfMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxJCZZWDM',
    // Shotgun (5729)
    199: '31FFIi3s2mFjWultKszDjlz_-ebfT3ClPGbBfCSIH109SbBfMGyP_Geis-mXEzDMQbx9QQxRfaAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxDNXFDug',
    // Scattergun (5727)
    200: 'y1FFKSPsyXF_YvBiB8fH0gL-77fcTHWuOW-Vf3mBRA49TuJYMW6L9jut7LyUF2zPROguRwEMevZSpzBXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFFEuZ0ds',
    // Sniper Rifle (5728)
    201: '31FFJCvo2GZ_bONgPfTKwRf8pKzeTnKmP2LGfXeATAhtGeFbYGzdqjug5-3GR26cEL59EA8BLvMN9TdAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-NMvvufd',
    // Minigun (5744)
    202: '31FbIyzx2mFjWultKszDjl3_-LaOH3ela2DBLnbdTwk9GbNdPGDY-TLw4OqXSj_IF7skFwsBe6EasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxYbsBTec',
    // SMG
    203: '31FFJyXH0XV_YuAibpvExAOp8rfbGiWjPWSUf3mORVowRLIKZmuP9zqmt-iTEDDIRu4sRBdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFo13LB4WQ',
    // Syringe Gun
    204: '31FFMzDx03NoYvBiB8fH0gL-7-fVSy2ibmbHfXCLTQ0_SeEIYTze_Tus4-qQFmmfQrl-Q1tQdaYE82xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFKUpM3DI',
    // Rocket Launcher (5726)
    205: '31FEJSHz2GBhZPBiO8PD0jr3oPCKGTqkP2HBeneNSw05TLcKN2CI-Dui4uidED3PSbp-FVsEfvFVoWVLNcuKIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umUR30DNl',
    // Grenade Launcher
    206: '31FROCf23HBoaeR5NsjOxRfEreOfG3G5OTKSKneJSl0-HLRYNmHbrGGs7bySEzjKReAtEFxXLKYN9GZMPcuOOAx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIKGN7nzvw',
    // Stickybomb Launcher (5743)
    207: '31FFPiv71m1vauhuB8fH1Qv4qeefI3j2ejDBYSDcSAppHOcNMG_Z_TWl5bvFQGvMRLp6RA4AKKQC9zIabMGLbUA90oQVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFwdArAtCjXQFq6y3SiRV7W0OuIM7JdYBV5LS0buk3cpB0gpvajQYgsWtnl38_abr8rkxtPxDx5wxSzuC7Y',
    // Flame Thrower
    208: 'y1FQJiP12GBld-p7Pdn5zATppufDRHGjODPFfySPGA5rGbFXZj7f_zSk4eiVQDrJRrslQwADf_EF8jVMa9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zrhr2UVGw',
    // Pistol
    209: 'y1FGIzHs0nhSaeR-P86IlwGq9rraRHX0MGHBeSLYTQtrSLFfMj7a-DL2sbucS27PEL5-EgoEfLxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7ill68n2Ag',
    // Revolver (5795)
    210: '31FELzT30WJod9pgOdnBxUuj97DfSnX2OjTBf3bbTw0wS7cMPWzRr2fx4byQFzyfRe8rQl9SLqMM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pZtZqoWD',
    // Medi Gun
    211: 'y1FbLybx2mFjWultKszDjgCo-LuOGHX2PGKdeiSKTA1qTbdaYG2L-2H3sO-XFmuYReB4S1sNKaMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxwAHkyVI',
    // Powerjack
    214: 'y1FGJTX9z35sZu5TNMrUxwC187reHyekbTSVdiDcRFppTbYKNDnRqGKmsOzCFzyfSO8qRQEEe6pV-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPVxpwtTPg',
    // Degreaser
    215: 'y1FSLyXq2HV-YPdTNMrUxwC187XYTyKja27HfHLdS106SOEMMTyM_TGktu_ARG7NQrksFQxQdaoM93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPW5L8nizg',
    // Shortstop
    220: 'y1FFIi3qyWd5avVTNMrUxwC1o7DaSiekPzSQdnmARA5uHLYNMW6N_jXwtrucQjidQusoRwkBfPcM8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPU0Up2WZg',
    // Holy Mackerel
    221: 'y1FeJS7h0HVubuB-Pcf5zATppufDHXamMGTHLiKPSQs_TuYLMm7Z_TOg4byWETvBRuEvQwwDLqMB8TJJP9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zpxae41sQ',
    // L'Etranger
    224: 'y1FaLzbq3HpqYPdTNMrUxwC1oLGLRXGhODaRe3OMGlo5ReJbNmmK_zWs7ejFS2zMFeslQwECfaoD8XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPURMpvDqg',
    // Your Eternal Reward
    225: 'y1FTPifq03VhWvdpL8rUxDr3oPCKGTqlMGOWeSfbT18xH7oNMTuKqjH05eiTFzGYQuEqRAsFdKUC-2JPPMyMIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umXHOSway',
    // Black Box
    228: 'y1FUJiP71nZifdpgOdnBxUv-p-bbGS3ybmfGLieKHQ1qS7ZfYDrf_zr3tO3AETDAR7opRgBQf6MM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pfaKs_gy',
    // Sydney Sleeper
    230: 'y1FFMyb22G1SdulpPdvD0jr3oPCKGTqnPzSVfHDbRAhtH-VWNGraqzT34OTHR2ycEukpEglWf6dW9mxBNcjaIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umcyTeD4x',
    // Bushwacka
    232: 'y1FVOC374n9jbONpB8fH0gL-7-HVHSOiazTGfCOAGVw9H7tcZDzbq2HwtO2QS23OEO4vRwEFdaAG9GRXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzF2ZfLfQQ',
    // Gloves of Running Urgently (5731)
    239: 'y1FUJTrx03NSYuljLs7V_xDppueDH23IZDbWKCSXRQw_HOFWMGqM92an5OqVRTrIRet6QV0FK6cD-jcdaJ2IaRFrhYdYriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANEOUZs72IxPtJDztzJEeY08CFsjE7g9PDruCKillCuGCOq7aecM5sRZAVFITR68kidzDBsh6fmMOwRItigg9fOT-8SwyYHnSV5nzrqnk5Gqjw',
    // Frying Pan
    264: 'yWJaFTL500thZPdrPYWelwf69LDbSXegOzPCeHPfT1w7GOYLMD6L_jGn5LiXQDrKQ716RA8BY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6I8yoxPuKH-uh9EbsY7QgcaR-x9YGDXXKvgkn-RDeuxbekI5ZQBXlEcHEm6ynUvBkkuvPHfdE0e5xZDpUt4',
    // Iron Curtain
    298: 'y1FfOC324nd4d_FtMcX5zATppufDSib0bGHGeSOBRQ9sG-BaMTvQrDem7O2cQj_AEOgkFQ0MKaMM9TJJNdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZoSMKl13g',
    // Amputator
    304: 'y1FXJzLtyXV5avdTNMrUxwC1o7XbGiGhPWGVdiLaHVoxHrMKNGqPrzGm7bnAQDvKSespSgEBf6oA9XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPU1eWW8wA',
    // Crusader's Crossbow
    305: 'y1FVODfr3HBod_ZTO9nJ0xb5rvWyEHXlbzKKLSWATA07SbNXMm-M-jGntO6VEzjKFeguEltWKfQM9WYbOpvcbhM1gplLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CGV8PGLoROTjDA6z5lXeRCOW3POQAs8kCUAgbQxy1mCZzDkl8ufDRbFtGty8npquSqJm4yMuvERdzO6yJwA',
    // Ullapool Caber
    307: 'y1FVKyD9z0thZPdrPYWVklf58-SIGHf0bGaQLHDcSwZsTOEPN2zR_TGi4umTFjHBEOwtF11XY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6I8yoxPuKH-uh9EbsY7QgcaR-x9YGDXXKvgkn-RDeuxbekI5ZQBXlEcHEm6ynUvBkkuvPHfdE0e5_DNuHob',
    // Loch-n-Load
    308: 'y1FaJSHw03hiZOFTNMrUxwC1-LLUGiSiODaRK3OORVxuT7EMYD2L-zal4--dSzCYR-B-QgsGL6cAp3oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPXWXS6fSw',
    // Warrior's Spirit
    310: 'y1FULyPq4ndhZPJTNMrUxwC1-LSPHiGhbWHAfXmJSwxqTrNaPW3e_jKs5OWQRm6dRb0rFwgDe6AH-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPWdhraV8w',
    // Brass Beast
    312: 'y1FRKzb01HpqWuJ5NvTKwRf8pKzeHS3zMWaTd3mBHltqHrEKMD2K_zWjtLiRFDDOFL0pRwgGdfcH82wcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-MteMLxR',
    // Candy Cane
    317: 'y1FVKyz8xEtuZOtpB8fH0gL-77XfGCTxPzKUdiSNHgptG-VZN2GLqDunse3BSj3KSL5-EgANeKsApjFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFABl-KpY',
    // Boston Basher
    325: 'y1FUJTHs0npSZ-R_MM7U_wn6s-WIUieuPjTALXXfRAo9ROFeMD6NrGX3trnCFmrAROolQFpVe6IFpjBPNcCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnAbzU_MA',
    // Back Scratcher
    326: 'y1FUKyHz4mdud-R4O8PD0jr3oPCKGTr1PG_HK3eITFo_S7BZNTnRqmKhtrudEDyfEut4RQAEffEApmMYaJjfIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umaVVLoFT',
    // Claidheamh Mòr
    327: 'y1FVJiPx2XxoZOhjMMbJ0jr3oPCKGTqkPzaVenCLGgwwSeFcNGHa-TrztOrBSznIQe8uQ10CeKJQoTYYPJqLIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umcpQ3pAH',
    // Jag
    329: 'y1FcKyXH0XV_YuAiPsqQmFyv8OTaGi32MGDALSPdSg04HuFXZjvb_jKntO-SSznBSOwrQhdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFqfB0O6hA',
    // Fists of Steel
    331: 'y1FQIzHszktiY9p_LM7DzDr3oPCKGTrxP2OQenaMRAw6SbcLZG2K-WWl4u-dSzrLSLwtElhSffQNo21BO52JIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umTwu9Klj',
    // Sharpened Volcano Fragment
    348: 'y1FEIyTs4nJkd-BTOdPD_wn6s-WIUnakamXBLnGKRQs-GbdYPGzZ_2agsOmRR27PSO8pQApSK6FX9TJNOsiXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnfmFzvuE',
    // Sun-on-a-Stick
    349: 'y1FEIyTs4nJkd-BTNcrFxTr3oPCKGTr0ajWRenbcGQ86SOFZZmyM9zOg7euUQDDJSeElQgEFeqZVoWJANJ_aIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umaU_4JVg',
    // Detonator
    351: 'y1FSLzb303V5avdTNMrUxwC1oLWPHSXzMWKTe3eKSlppSLZaMWDZ-Dui5byRQDvASLp6FQoEdPBS8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPV5Y_zETQ',
    // Fan O'War
    355: 'y1FFIi3_yHpScuR-PsrI_wn6s-WIUiOjbmWSdnLfTV87S7sLMGHR-mCi5uuXRDrOSeAvQggMeaBVoDFLaJ2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn-CC29ZY',
    // Conniver's Kunai
    356: 'y1FFIi3_yHpSbvBiOcL5zATppufDGCL2OWWdfXbdGQZtRLVfMj3R-DPzs7nFS2rLSLwoFQFRffYHpjdJbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZpX2LuGXA',
    // Half-Zatoichi
    357: 'y1FFIi3_yHpSbuR4OcXH_wn6s-WIUiH2OmbAfnSKSAk6TeIKMmjYrzKlsLvBF27LQLp9FggGfKUE-2RJacGXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn9CfXp5I',
    // Shahanshah
    401: 'y1FFKSv11GBsd9pgOdnBxUuuo7fURXH2bGaRKieOTl87H7tYND2Mqzqk5rvBQjHJQbssEAhQf6sC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pXbZXdT5',
    // Bazaar Bargain
    402: 'y1FUKzj53GZSdutlKM7U_wn6s-WIUiXzbTTCf3COSwxpTrUNMm2P-GWs5ruQQTnNFLp-RlhQKasM82Eaa52Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn2iQe5BA',
    // Persian Persuader
    404: 'y1FSLy_34md4afFtNvTV1wrppd2BHWbwbXmSKnCBTlwwHrcKZGDRrDDz4OuSQ23PQOgqQQ1XfPYA-mVLOMmNPhc8ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrc_Gk0VEoYiNCvWAeexynfOWOaxOuhf7ZNXBlgTGUe-yXx6Dxx44fHfPAtH4X9y-6KV-8W20JWxGJ87vD-u',
    // Splendid Screen
    406: 'y1FGLzDr1HVjWvZkMc7KxDr3oPCKGTrxOzGQLHPbGVhsG-JaYD7e-mLx4-idF2vISLsuQQsFLKRQ82JBOc3cIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umcIhDRPO',
    // Quick-Fix
    411: 'y1FGOC3s0ktgYOFlP97I_wn6s-WIUnf1a2SceXTYRAg-SrVXNjyP_2L0s-6TQ2vLELx4SlgGdKYA-mFPb8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pnq3L0UQA',
    // Overdose
    412: 'y1FGOC3s0kt-fPdlNszDxxD1nu6MDnPyJmfBeXWAGgsxSOVYNG3e_jHws-_HFGnLQu0pFwgHK_AN-2RJb5qIahAjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou4eBRAGbM',
    // Solemn Vow
    413: 'y1FeIzLo0nd_ZPFpK_TE1Rbvnu6MDnPyJmHFeXfdGVg7RLUMN2zQ-mGjsO7FET-fR-8oEQ1VKKJR-2VJbsjbNhYjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou4YPRcJ54',
    // Liberty Launcher
    414: 'y1FaIyD9z2B0WultLcXFyADpnu6MDnPyJmDAdnKATFhqSOZXNznf9zah4LiVFzHMRL0pRQoMevFQ9WwfbpqIOxUjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou4ARHtwYQ',
    // Reserve Shooter
    415: 'y1FELzH9z2JoWvZkN8TSxRfEreOfG3G5P27FfiPaSw8-HrNbMDmL9zX04OjCSzCaFLwlS10GdKcC9mxNOsqNawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkILZ-x-Kog',
    // Market Gardener
    416: 'y1FbKzDz2GBSYuR-PM7IxRfEreOfG3G5PmSVLXWNSQxqG-BbZm2MqzT05unFED3LR-goRAEAfvdW92IfacDbPQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkILDDkfn7A',
    // Tomislav
    424: 'y1FCJS_xznhsc9pgOdnBxUuipeDeGCz0bmOXdnHbSgpqS7ENYGve_DPxse3GFj3BQb4kRl8GfKMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pZ3cvyoZ',
    // Family Business
    425: 'y1FEPzHr1HVjWvdlN9_5zATppufDTy3xaWKXfCXdHVhrTrIPYDvb-mDz4biVQTvKRL0sQ1sCfaNQpjVKONfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZoCOEk20g',
    // Eviction Notice
    426: 'y1FTPCv7yX1ia9piN9_PwwDEreOfG3G5PjXAeXXdHgY-G7JeMWGM_TGm5O-RQmycQbouRFwNKKsFoDcaaZ2BbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIIT-joiqA',
    // Cow Mangler 5000
    441: 'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umc7xkVV9',
    // Righteous Bison
    442: 'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CGV8PGLoROTjDA6z5lXeRCOW3POQAs8kCUAgbQxy1mCZzDkl8ufDRbFtGty8npquSqJm4yMuvERe8yEGIHA',
    // Mantreads
    444: 'xW9YPjD93HB-WultKszDjlypp7GJGnD2bmfBfSONTQdsGbcKYTzcqGD25bmVE2vMQuApEABXefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxdQgjt2U',
    // Disciplinary Action
    447: 'y1FEIybx03NSZvdjKPTKwRf8pKzdT3DxbWaVeXeARAZuGbYNNDqM-DTw5umTRj_AQeksSw8DffdW8jYfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-Po2HEar',
    // Soda Popper
    448: 'y1FFJSb54mRidfVpKvTKwRf8pKzVRCCmP2GSfHGAS1o7TeYNNmyKrWbz5-WXETCbQ-orFVwFKKIE9mxBI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-O1fTw9C',
    // Winger
    449: 'y1FBIyz_2GZSdex_LMTK_wn6s-WIUnGmaTXCdnncHwkxGbBXPWrcqDGit7-QQGzOQu8pSw9QLKVV9GZPbsuXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PniNmeDqw',
    // Atomizer
    450: 'y1FUJSzz4nZscdpgOdnBxUuj8ubaGXClMGLHKiSOGl09GLFYNmzc92Wg4unGFm7JQO14FV9QLvcF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pQKDeVuI',
    // Three-Rune Blade
    452: 'y1FFKS3tyUt-cup-PPTKwRf8pKzVSnKgam-SLCDcGgxqG-APMTmPr2ass77BET3OEukrQl0Af6AF-zEYI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-IzxlfqO',
    // Postal Pummeler
    457: 'y1FbKyv033t1WultKszDjgP4-LSMTXahPGTCfiKKTlg6G7INYWiP-Wen5OicEDifF7ovF18FefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxRkplfJo',
    // Enforcer
    460: 'y1FFJDf64npiduBTNMrUxwC1-bGMGiyiO2LHdiCBTw49RLcMMW7brGGh5LyTEzjIR-p6QwhSePYCoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPVjv1UHYg',
    // Big Earner
    461: 'y1FFPSvs3nxvaeRoPfTKwRf8pKzfTXemazaSeXbaTFwwH7BYYzzb-mXw7emSEz6cE7x6QV0HKfZV8jdPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-KcjP3FZ',
    // Maul
    466: 'y1FELCPH1XVgaOB-B8fH0gL-77TeTnL0OG6XLHDfTAtpRLtfPG6M9mGmsO2cRDmbQ7woFwANf_QApmxXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFapopBGk',
    // Conscientious Objector
    474: 'y1FGIyHz2GBSaeR-P86ImFyu97OOGXKuPDOWfnWOT1xsRLENYT6P-jqgs7jHRj-fFbx4RlwGfrxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7inMLDiDyQ',
    // Nessie's Nine Iron
    482: 'y1FRJS7-3nh4Z9pgOdnBxUuu8LXdRCLzbGOdfCWJRQs9SeILMmCK-zX07ejGQT7PQukpS18Df6dR7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pYyos62F',
    // Original
    513: 'y1FULzbHz3tubuB4NMrTzgbzpPCyEHXlbzKKeCLfTA4wSLReNGze9zaj5riWFz_MQ-l5RgBVKaIG8G0dOJrYbRI1gJlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CGV8PGLoROTjDA6z5lXeRCOW3POQAs8kCUAgbQxy1mCZzDkl8ufDRbFtGty8npquSqJm4yMuvERfgCQ_mHQ',
    // Diamondback
    525: 'y1FSLzrHz3F7aul6Pdn5zATppufDTy32aW6SKnLdS1o7S7tXPWja9zT37LjHRz_BR7soFwtReKpS8DVLOdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zrhevhwgw',
    // Machina (5796)
    526: 'y1FSLzrHznpkdeB-KsLAzADEreOfG3G5bTSVf3PbHlxuSrtaN2ra-jL2sbvAFD6aFb55QA4EK_ZWpzBLaMqAawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIK95TLxMA',
    // Widowmaker
    527: 'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-EVuMvyP',
    // Short Circuit
    528: 'y1FSLzrH3GZgWultKszDjlSroOeLGHKuOGGReCDbRVw4G7JWYG-N-jWj5b-cFz7PRekkFwkAe_casjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxgKUMnEI',
    // Unarmed Combat
    572: 'y1FDJCPq0HFpWuZjNcnH1Dr3oPCKGTqgPmCQe3SLRFxrH7FeYW2I_Tqn4eucET2YRO8tF19QevQDoDVAPMmIIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umVnCtimH',
    // Wanga Prick
    574: 'y1FAJS380ntSdexiB8fH0gL-77PYTSX2bG_HKnmJSgs5RLcKZ2Hf-zCj5bzBETrLF7wkFQxQevYF8GZXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFGFSVp9k',
    // Apoco-Fists
    587: 'y1FFOHHHzWFjZu1TNMrUxwC1pLqLTSL1OGfCf3fYGQdsHLEPNj2N9jPztruTSzHOFex6RAkEeqcE93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPU5xjC6gA',
    // Pomson 6000
    588: 'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFXeWkDxA',
    // Eureka Effect
    589: 'y1FSOCXHymZoa-ZkNcTS0gr1nu6MDnPyJmDFLCPcSww9SLRXMDnfr2Ws4rnBQzybSbwuEQkGevEE9zVMOc3YbRIjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou40fNIrOg',
    // Third Degree
    593: 'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkILTMY7A-Q',
    // Phlogistinator
    594: 'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CGV8PGLoROTjDA6z5lXeRCOW3POQAs8kCUAgbQxy1mCZzDkl8ufDRbFtGty8npquSqJm4yMuvERfF0ZPg3Q',
    // Manmelter
    595: 'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnSrCD6-g',
    // Scottish Handshake
    609: 'y1FFKS3s0XVjYdp_MMrUxDr3oPCKGTryPDOTeieNSV09HrpeMDzd_juh4OyURW2bQuEoQw0MefNR8W1IbMDYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umblko_Nk',
    // Sharp Dresser
    638: 'y1FXKTDH1XtibudgOc_D_wn6s-WIUnXxbmGReHeLHgY6SbJdZGnf_Drws76cQz-cROwrEAwEf_FSpjcdO8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75PnWscgmKA',
    // Wrap Assassin
    648: 'y1FOJzHH2n1rcfJ-Odv5zATppufDTiakbWeULSWPSlhsT7ZYNTzf9jb37L6cETjPEuElQgkCeKMG9jBLbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZqKxa3ttg',
    // Spy-cicle (5732)
    649: 'y1FOJzHH3nthYdp_MMTTzAH-s92BHWbwbXnGKnaJHgk-ROVaMWCL9jL0s--WEDDKQO9-RgAHf_RV92dINc2NPRY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrc_Gk0VEoYiNCvWAeexynfOWOaxOuhf7ZNXBlgTGUe-yXx6Dxx44fHfPAtH4X9y-6KV-8W20JWxGK_xHfIR',
    // Holiday Punch
    656: 'y1FOJzHH2nhic-B_B8fH0gL-77HeSHKvbTXFKXeBGAwxS7cMNDne-Dqi4unCEz2cQugvFg4DffAF-m1XfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFChr0gZ4',
    // Black Rose
    727: 'y1FXPCPHz3t-YO5iMc3D_xPEreOfG3G5bW6TfnndSAk_H7oKPGDdqjf2seqdQjzPFLx4QQkDfKANoTUfOp2OOgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIL33qlmcw',
    // Beggar's Bazooka
    730: 'y1FSPy_ozmBod9poPd3PwwDEreOfG3G5aWHFeyOMGQZpSeJXMGCMqGX0t7icRGvJSOEtQwpSdPAB8WNIP8vbbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIIPImIwmQ',
    // Lollichop
    739: 'y1FaJS701HdlavVTNMrUxwC187CITXenPmGVLHaPRVo9T-ZcNjuMqjDxsOTFFD6YSboqFwoEdfYC93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPWkU9_ktA',
    // Scorch Shot
    740: 'y1FFKS3q3nxSdu1jLPTKwRf8pKzbHnWgbjSRdnaNRQpqTrNXPDvb-DP25b-URT3NQL0qRAwEf6QApmIfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-HSLwcjW',
    // Rainblower
    741: 'y1FEKyv233hicuB-B8fH0gL-77bYHXGhO2aWf3CMTA06H-VePW6Krzus5buVSzvIELwqEV0BeaFS9TdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzF8BiPZrc',
    // Cleaner's Carbine
    751: 'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxUA_vhsI',
    // Hitman's Heatmaker
    752: 'y1FGOC3Hz31raeBTNMrUxwC1o7LaRXHyOWfGLSfbRVxrG7pZNGzf-zumtL7HFD_ISb4pSwkMeKtV9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPX9v1kazA',
    // Baby Face's Blaster (5797)
    772: 'y1FGLzLHzndscfFpKszTzjr3oPCKGTqmMGTHfiXbGgc-G7ULNmjbq2as7OWUQz7BSLl4EF8GKfMN9TBPOMiJIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umVZodjMI',
    // Pretty Boy's Pocket Pistol
    773: 'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFgdGjt3s',
    // Escape Plan
    775: 'y1FGIyHz3GxoWultKszDjlSs8ObYTC2mMTKWeiXbTgprGOEPMmzb_GCn4OmRFDHIQLx-S1gEKfEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479J1HqJfxhAFCeY84VVhFSL94YGqEXa_vkXnJX-rhN-Jb7cBQAggTQknrnXMqDh0g6P6NYgte8CBxQ6ZqMEA',
    // Huo-Long Heater (5798)
    811: 'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imbYcENKg',
    832: 'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgByZ5Vsp3NtwxRbI1zHQdFF-97ZmyIAvG1xC-ZV7C6PLMB5MEFBlASTBm7nCV6W0Ap763RbBMA7imbYcENKg',
    // Flying Guillotine
    812: 'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFsqbZlH0',
    833: 'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJzzqARAVIQ8CVkZX793bD-HUfriyiiQDOTjPuha7cICX1gaHx60k3ItCU546a3QagoUuHg4svzFsqbZlH0',
    // Neon Annihilator
    813: 'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-MN7kWss',
    834: 'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-MN7kWss',
    // AWPer Hand
    851: 'y1FVOSX34nV6ddpgOdnBxUv5-LPUGHWkMWWTKSWNSQ89TeBWY2GL-Gfws-zFRj3KRr15EA9VKPAC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pSe82Nxi',
    // Freedom Staff
    880: 'y1FCPR393HNhYNpgOdnBxUv_pbGJTiKiMGeTf3GLGQ44RbYPNWve-Dr2sbidRzHBQ7woRAkFfPZW7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pZm5cEI-',
    // Bat Outta Hell
    939: 'y1FFITf00XZscdpgOdnBxUv4oLfYHnL0MWWReXjbSgw7GeVdMmrbrTOltOSVRD7JQ-96SgEMfvFV7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pea4Xq5g',
    // Loose Cannon (5799)
    996: 'y1FSLy_34ndsa-tjNvTKwRf8pKyPHi3yam_GeiXaHl9qHrJYZmHYrDGj4-SQS27IEuwkEg8AK_QNoTYdI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-AOUGsJX',
    // Rescue Ranger
    997: 'y1FCLy794mdlavFrLcX5zATppufDTifxajaRfnmATwg8H7VfN2nf_TKj7O2XFzzLErl6QwsCL_cG8TdJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zrkbi4W8w',
    // Vaccinator (5800)
    998: 'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIIwrO4JpQ',
    // Ham Shank
    1013: 'y1FeKy_H0XV_YuAiYJKfwlOv9bOMGiDxPTKReXmAGls7TeVZMmmK_DWisOrHQDCdSO8rShdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjXJwtwpx5t5_gvAgNbdFkHQhJQux3M2HTU6jmyi2QXbG6PuFctMhYUQ8cTR68z317CB0h7ueZNFpHSFQWYQ',
    // Fortified Compound
    1092: 'y1FUJTXHyXxkYONTNMrUxwC18-PVTHKlOWaSeXSPRV0xSLsLZmGN9jantOqTFjjPSb5-Fg9SKaQH93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPVhA72C-g',
    // Classic
    1098: 'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIKM7kL1rw',
    // Tide Turner
    1099: 'y1FBIif90Ut-bexpNM_5zATppufDTyylamaTLXbaGlg-S7FZNGDaqDCj4rmXSjnBR70rElgDeqBW92cfOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8Zrk7aM7OA',
    // Bread Bite
    1100: 'y1FUOCf52Xlia_Z4Pdn5xwn0t-eeI3j2ejDBYXDbGAg9H-JWMW3bqzL34ezGETHBFL19F10BKaYHozYaOsDcbRtu3dEVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFwdArAtCjXQFq6y3SiRV7W0OuIM7JdYBV5LS0buk3cpB0gpvajQYgsWtnl38_abr8rkxtPxDx5wGB2quK4',
    // Back Scatter (5748)
    1103: 'y1FFKSPsyXF_Yfd5NfTKwRf8pKzYSyOiOWOcKXKIH1ttTrpdYWGN_Teh5L6SRW3BFe0lQg0MKfQCpGFLI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHwuh5KaLcxGkwbFPcobGDXUvzkxnfOVrG1buAAtslTBVEbShrsknx9WU8uufiNYw1H5HYg7OLM-I026Afp',
    // Air Strike (5801)
    1104: 'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hA9CeIE-JFIdA74rez-IXa_hxn2dV7W6beZY5MgDX1pIQk69ziVyB09_7v6Ia1lJsHly-qSM75Pn50Frmu0',
    // Necro Smasher
    1123: 'y1FVKzD21GJsadphOcfKxRHEreOfG3G5OGWWf3HbHwdtG7dfZGzf_zSssO6RRjDPRO4rSgwHK6UBo2cYOZ3baQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkIK6MWhiwQ',
    // Quickiebomb Launcher
    1150: 'y1FdIyz_0HVmYPdTK9_Pww7inu6MDnPyJmCVLHWKRAxrRbpWNzvYqjWgseTCQzvBQLwrSwhRe6RV8GxObsvYPEMjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIo8CFcfLrUvJz7USq_uyiieW-C3NrcBt8YBVlBJQkzvk3V7Whgg4P-PbAoRsSov8qXGp8uujou4KIDABag',
    // Iron Bomber
    1151: 'y1FHPyP833VhadpgOdnBxUv997bYRHCkamCQLHWBTl1uGLRfNzuN-2ah4-nGSmuYF7p6QwkFdaMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBEuo37uDJPapo6HhAaSOAoY2yCUfCxyyyfD-K7bOkKt8lRVwxLQ0e7zXJ8Xkh94fnePgVGrj54pevquAvM',
    // Panic Attack
    1153: 'y1FCOCf23nxqcOtTNMrUxwC19OaOGS2hOWaXfHLdSQc_SbBYYTrYqDX0t-iUET-fR-5-FQ9Re6YCpnoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPXuIEe7fw',
    // Dragon's Fury
    1178: 'y1FQJiP12HZsaelTNMrUxwC19uaMTCyhPTaRLnSKTQ9rSLMKNWDdqGemsLjHRDCfFLokQg8HfKUF9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5uZ_hsg58Z4kvHFtSF-B3M2-EV_zulXbKWbKzNrIB5pNYVllPG0a1nSJ9CBgovPDZbVlItmBmrPUiPAafqg',
    // Hot Hand
    1181: '31FFJiPozX1jYtprNMTQxTr3oPCKGTr0ODbFdySASl9rG7JcMGzZq2eituTFRGmYQOouRQ1WfacC9TZJPJ-KIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJBaps0GGEQEKspMHfXXfCxxXubW-rkN7MOtMBZBFEZGEe8myEqBkEvvv_eOwwUuX4hpqqUsY3umVuY9VSw',
    // Shooting Star
    30665: 'y1FfJDT5zn1ia9p_NsLWxRfpqOSBGUv7aSXDKm_YH1s5SuELZmuMrzrzsL_CFGvLF-p5Sg4NdaQApmBJPJ_caho80NEC5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdX9MTWJgt2JZJtZ_-hApRbokuHmEeEKonNgbdBbuwlmDOV-rkOeQK4MgGXwsdG060yHx4XUEo6KyIYwVG5ngho6PGps23mt3pUQB5x86g4XiZ',
    // C.A.P.P.E.R
    30666: 'y1FfJDT5zn1ia9p8MdjSzwnEreOfG3G5OTLFfieAGgcwSrddZ22I_2Ggt7vFFj-aQrsrFQ4Ce6sN92VBNMrabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8aYkuEl0jHbg8MjyfAvDulXidXea7aelb4pBRXgoSSR21mnQuXkAh7q_fbVxB5Hcm9faaqdPwkII1ldUA3Q',
    // Batsaber
    30667: 'y1FfJDT5zn1ia9puOd_5zATppufDHyL0amWReniJSFg_HrYINT7Q_jH34L-QFDufRbssElgCf6MG-zAaOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNuQxQYosCF18OFrxgM2CIAv_iwHuRCOvgOLAI7JJYVAsSS0_oyn1zCR8v76jYPgRAtyou9LzS8ZqHTEk8ug'
    /*
        Don't have:
        - Sandvich (42)
        - Razorback (57)
        - Jarate (58)
        - Dead Ringer (59)
        - Cloak and Dagger (60)
        - Buff Banner (129)
        - Gunboats (133)
        - Wrangler (140)
        - Dalokohs Bar (159)
        - Crit-a-Cola (163)
        - Golden Wrench (169)
        - Invis Watch (212)
        - Mad Milk (222)
        - Battalion's Backup (226)
        - Darwin's Danger Shield (231)
        - Rocket Jumper (237)
        - Stickybomb Jumper (265)
        - Horseless Headless Horseman's Headtaker (266)
        - Buffalo Steak Sandvich (311)
        - Concheror (354)
        - Ali Baba's Wee Booties (405)
        - Fishcake (433)
        - Bootlegger (608)
        - Cozy Camper (642)
        - Festive Minigun (654)
        - Festive Rocket Launcher (658)
        - Festive Flame Thrower (659)
        - Festive Bat (660)
        - Festive Stickybomb Launcher (661)
        - Festive Wrench (662)
        - Festive Medi Gun (663)
        - Festive Sniper Rifle (664)
        - Festive Knife (665)
        - Festive Scattergun (669)
        - Sapper (736)
        - Construction PDA (737)
        - Silver Botkiller Sniper Rifle Mk.I (792)
        - Silver Botkiller Minigun Mk.I (793)
        - Silver Botkiller Knife Mk.I (794)
        - Silver Botkiller Wrench Mk.I (795)
        - Silver Botkiller Medi Gun Mk.I (796)
        - Silver Botkiller Stickybomb Launcher Mk.I (797)
        - Silver Botkiller Flame Thrower Mk.I (798)
        - Silver Botkiller Scattergun Mk.I (799)
        - Silver Botkiller Rocket Launcher Mk.I (800)
        - Gold Botkiller Sniper Rifle Mk.I (801)
        - Gold Botkiller Minigun Mk.I (802)
        - Gold Botkiller Knife Mk.I (803)
        - Gold Botkiller Wrench Mk.I (804)
        - Gold Botkiller Medi Gun Mk.I (805)
        - Gold Botkiller Stickybomb Launcher Mk.I (806)
        - Gold Botkiller Flame Thrower Mk.I (807)
        - Gold Botkiller Scattergun Mk.I (808)
        - Gold Botkiller Rocket Launcher Mk.I (809)
        - Red-Tape Recorder (810)
        - Deflector (850) - MvM
        - Rust Botkiller Sniper Rifle Mk.I (881)
        - Rust Botkiller Minigun Mk.I (882)
        - Rust Botkiller Knife Mk.I (883)
        - Rust Botkiller Wrench Mk.I (884)
        - Rust Botkiller Medi Gun Mk.I (885)
        - Rust Botkiller Stickybomb Launcher Mk.I (886)
        - Rust Botkiller Flame Thrower Mk.I (887)
        - Rust Botkiller Scattergun Mk.I (888)
        - Rust Botkiller Rocket Launcher Mk.I (889)
        - Blood Botkiller Sniper Rifle Mk.I (890)
        - Blood Botkiller Minigun Mk.I (891)
        - Blood Botkiller Knife Mk.I (892)
        - Blood Botkiller Wrench Mk.I (893)
        - Blood Botkiller Medi Gun Mk.I (894)
        - Blood Botkiller Stickybomb Launcher Mk.I (895)
        - Blood Botkiller Flame Thrower Mk.I (896)
        - Blood Botkiller Scattergun Mk.I (897)
        - Blood Botkiller Rocket Launcher Mk.I (898)
        - Carbonado Botkiller Sniper Rifle Mk.I (899)
        - Carbonado Botkiller Minigun Mk.I (900)
        - Carbonado Botkiller Knife Mk.I (901)
        - Carbonado Botkiller Wrench Mk.I (902)
        - Carbonado Botkiller Medi Gun Mk.I (903)
        - Carbonado Botkiller Stickybomb Launcher Mk.I (904)
        - Carbonado Botkiller Flame Thrower Mk.I (905)
        - Carbonado Botkiller Scattergun Mk.I (906)
        - Carbonado Botkiller Rocket Launcher Mk.I (907)
        - Diamond Botkiller Sniper Rifle Mk.I (908)
        - Diamond Botkiller Minigun Mk.I (909)
        - Diamond Botkiller Knife Mk.I (910)
        - Diamond Botkiller Wrench Mk.I (911)
        - Diamond Botkiller Medi Gun Mk.I (912)
        - Diamond Botkiller Stickybomb Launcher Mk.I (913)
        - Diamond Botkiller Flame Thrower Mk.I (914)
        - Diamond Botkiller Scattergun Mk.I (915)
        - Diamond Botkiller Rocket Launcher Mk.I (916)
        - Ap-Sap (933)
        - Quäckenbirdt (947)
        - Silver Botkiller Sniper Rifle Mk.II (957)
        - Silver Botkiller Minigun Mk.II (958)
        - Silver Botkiller Knife Mk.II (959)
        - Silver Botkiller Wrench Mk.II (960)
        - Silver Botkiller Medi Gun Mk.II (961)
        - Silver Botkiller Stickybomb Launcher Mk.II (962)
        - Silver Botkiller Flame Thrower Mk.II (963)
        - Silver Botkiller Scattergun Mk.II (964)
        - Silver Botkiller Rocket Launcher Mk.II (965)
        - Gold Botkiller Sniper Rifle Mk.II (966)
        - Gold Botkiller Minigun Mk.II (967)
        - Gold Botkiller Knife Mk.II (968)
        - Gold Botkiller Wrench Mk.II (969)
        - Gold Botkiller Medi Gun Mk.II (970)
        - Gold Botkiller Stickybomb Launcher Mk.II (971)
        - Gold Botkiller Flame Thrower Mk.II (972)
        - Gold Botkiller Scattergun Mk.II (973)
        - Gold Botkiller Rocket Launcher Mk.II (974)
        - Festive Holy Mackerel (999)
        - Festive Axtinguisher (1000)
        - Festive Buff Banner (1001)
        - Festive Sandvich (1002)
        - Festive Ubersaw (1003)
        - Festive Frontier Justice (1004)
        - Festive Huntsman (1005)
        - Festive Ambassado (1006)
        - Festive Grenade Launcher (1007)
        - Golden Frying Pan (1071)
        - Festive Force-A-Nature (1078)
        - Festive Crusader's Crossbow (1079)
        - Festive Sapper (1080)
        - Festive Flare Gun (1081)
        - Festive Eyelander (1082)
        - Festive Jarate (1083)
        - Festive Gloves of Running Urgently (1084)
        - Festive Black Box (1085)
        - Festive Wrangler (1086)
        - B.A.S.E. Jumper (1101)
        - Snack Attack (1102)
        - Self-Aware Beauty Mark (1105)
        - Mutated Milk (1121)
        - Crossing Guard (1127)
        - Festive Shotgun (1141)
        - Festive Revolver (1142)
        - Festive Bonesaw (1143)
        - Festive Chargin' Targe (1144)
        - Festive Bonk! Atomic Punch (1145)
        - Festive Backburner (1146)
        - Festive SMG (1149)
        - Thermal Thruster (1179)
        - Gas Passer (1180)
        - Second Banana (1190)
        - Nostromo Napalmer (30474)
        - Giger Counter (30668)
        - Prinny Machete (30758)
        */
};

const ks2Images: { [target: number]: string } = {
    // Specialized Killstreak Kit
    // Kritzkrieg
    35: 'y1FZPCfq1XFsaeB-B8fH0gL-7-OISHauPTOUeiDYRQ1qTOBaN2vZ_jSt5eWVEGnKQu0rRwwFfqIE92xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXOt_xzn8',
    // Blutsauger
    36: 'y1FaLyf71XN4a9pgOdnBxUv5ouHaTS31bmDCd3iBH1g_SeINMj6Ir2H3sbiTE2rJQ-4oR1sHe_AF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPS3h5Ays',
    // Ubersaw
    37: 'y1FDKCfqznV6WultKszDjgSsp7GMSy30OjPHfSeLT1g4GLZeM2iL_TTx4OWVETmfQb0lFw8BfvQasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOI5jad_M',
    // Axtinguisher
    38: 'y1FXMjbx03N4bPZkPdn50Bzprt2BHWbwbXnHeXbfGQ0wSOdfZDnc_mWssb-cED7JQeksQwgNevFXpm1PbMqANhA_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcxGkwbFPcoZjrSV_21xC3MXuTkOeFY45BTVgweTk_pnnEpWx98vv2IOA1GtH0i7OLM-BT7bFeC',
    // Flare Gun
    39: 'y1FQJiPq2HN4a9p8IdnJ_wn6s-WIUnGhPmSVfXSNGgo6TLNZY2iP_Tuk4r_AQTrISO8tFw0CfPRWoGUbbsyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxG6FlXmU',
    // Backburner
    40: 'y1FUKyHz32F_a-B-B8fH0gL-77SIGCDyOG6VfHGJSVwwGbdWN26I9zun4-rHSzGcSespRVhQf_MGpmFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXsI5QXnY',
    // Natascha
    41: 'y1FBFS7t2XlkaeRTNMrUxwC187aLS3WibGWdfHbaRVxrHrpdNWqMrGL37b-QR2vPEroqFQ4HLKtR8HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFo4tjVkLg',
    // Killing Gloves of Boxing
    43: 'y1FUJTrx03NSYuljLs7V_wn6s-WIUnegaW6TdniBGVhsSrNaMWDc-TDw5rnARmufROl5R18GL6FX8WAdacCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxgyb3-po',
    // Sandman
    44: 'y1FBJS382HpSZ-R4B8fH0gL-77aMHS2nMTOWKXPfS1xqGLQLYTnZ-TLx4u-cRmvNEuouEV9XdaZQ8jJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX-y95lLQ',
    // Force-A-Nature
    45: 'y1FSJTf60XFSZ-R-Ks7K_wn6s-WIUi32amScLniNTlpuH7dWPW7b9meltunAEDCbQb0pSl9ReKVWozVMbJyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxdEVWMXU',
    // Huntsman
    56: 'y1FUJTXH0XV_YuAiapvFkFKq87TaGCajOWWceiCOTw08TbddNj6M_2WhtL6SQzvMFO1-FRdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR4RzbFKSQ',
    // Ambassador
    61: 'y1FXJyD5zmdsYep-B8TW1Dr3oPCKGTrzOjXALXSNSAtqRbFaNGvdrDDw4-vBFzjPQewpRgxSfqsBpzUaNM6AIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pX9N5Tl3',
    // Direct Hit
    127: 'y1FSIzD93mBlbPFTNMrUxwC18rOJS3GhOWfHK3fdRVw5TuBeYT7f-Tf34buXRjybQOkvQAkHf6ED9noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFr1GesOdA',
    // Equalizer
    128: 'y1FGIyHz3GxoWvY-B8fH0gL-77vbH3LyOmaWKSWPHwlpH-FXMGGM-2Wj5urGQTydE-h4Rl8NfqVRo2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX39hdoSk',
    // Scottish Resistance
    130: '31FFPiv71m1vauhuB8_DxgD1peefI3j2ejDBYXTcHg08RLBfPGqK_DSt57idEzjKSLp_FVxSLqsMoWEbaJuJPENv3YAVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFIdA74rez-CB6rkxyyfDbeyOLcP5ZBWBlobH0u5myB-Cht9vqyPblwSsHgi8aaM75PnZVBFHfg',
    // Chargin' Targe
    131: 'y1FCKzD_2EthZPdrPYWexFf58ObbTnCnbWOXLnKJT1puReVbNW_Yqzf04uyUF2ybRbt6F18AY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Iyyo1BvtD06A5AONw_TF0YQe4oY2nQUqjkwiucWuPmOuRbsZcFAV1LGE-7n3d_EQl3v9-wa3Xl',
    // Eyelander
    132: 'y1FVJiPh0Ht_YNpgOdnBxUus8LGPSiKgOGSUenmJRAg9RLNfYGyI-Gbw5evGS27BSbt-Q1gEKKsF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPW-_RqMn',
    // Frontier Justice
    141: 'y1FQOC32yX1od-95K9_PwwDEreOfG3G5am6SfSOJTFw5TecLZ2HYqjGk4-XBQGvIFOwvEV9QeaJV8mZKO8vabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPVd5cfvWg',
    // Gunslinger
    142: 'z3tYOS7x03Nod9pgOdnBxUuvpOaISyfyO2XHfHaKSlxuTeIINWyLqmb04u_CQD7BQuEuQlpQKfYF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPZJr6dGu',
    // Homewrecker
    153: 'y1FFJif82nFlZOhhPdn5zATppufDHiKmP2CXKnGMGA09ReIKNm7c_Tui7OuXFmqaQL4oSglXfvMGoDFJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7inHU3-v-A',
    // Pain Train
    154: 'y1FGKyv2yWZsbOtTNMrUxwC1pbXYSnfzMG6cdnOIHgo_GLdcNWuKr2WjtruSQmqdQrkkQQwNf_QF8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoNV4ZgAg',
    // Southern Hospitality
    155: 'y1FFOivz2GN_YOtvMPTKwRf8pKzZRCXxOW_AKXSOGQc-TbAPNDnd_jb0s-uSETvJQ7ouEV1WK6tVp2IbI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56OVjcx7',
    // Lugermorph
    160: 'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56GpZyUr',
    // Lugermorph (second one?)
    294: 'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56GpZyUr',
    // Big Kill
    161: 'y1FCPiXHznVgWuJ5NvTKwRf8pKzfSCOuOmPCfSCMGlwxG7ALMmyK_TLx5-qSSj_JFLwoEV1Qe_cM9TFPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5wcCwkyy',
    // Tribalman's Shiv
    171: 'y1FBJS384nlsZu1pLM75zATppufDSXGua2OTKyXbTgY_TbFbYW_d_jPw5u_BRTrBQOF6F1sMLqBV8GBBaNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikx5bmquA',
    // Scotsman's Skullcutter
    172: 'y1FUKzbs0XFsfeBTNMrUxwC19LvYS3euMTGdfnjcHVg_TuVaY2yIrDXz5uyXF23IE74kFQ4GfaVRoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoa0J7cmw',
    // Vita-Saw
    173: 'y1FDKCfq03FoYelpB8fH0gL-77XVHyX0PG7CdiOKHVtqG7cKM2mK_2Gt4-_BEz-dEOp_Q1gGf6sE-2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX8urJ7aU',
    // Bat
    190: 'y1FUKzbH0XV_YuAiPJuVlgf-87HYTHGjP2DAKyOKTAs_S-FaNDrR_WKj4-uTETjLE-gkERdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR6CTh6Fqw',
    // Bottle
    191: '31FUJTbs0XFSaeR-P86IlFH99LWOGCLyMTKcLHiORAxqTrZfNWDe_mb35u2SRGzISL4kQg0GdbxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq5ZULhmDA',
    // Fire Axe
    192: 'y1FQIzD93GxoWvV1KsT5zATppufDHnGgMG-UfiTdRFpuSucNYWndq2Gt7LiUFm2fQ-8uRwkMfaMG8mFINNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikQcFSvpQ',
    // Kukri
    193: '31FbKyHw2GBoWultKszDjgT5-LLcSSCvODSRLXXaGFhpT-JWM23e-TSg7bnCRm2bQbsqFQwCffYasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeO0KEHoZU',
    // Knife
    194: '31FdJCv-2EthZPdrPYWUkgf6-OOLGSHzOmWSeSWKGAdpG7MIMjyKqDqsseuTFj3BSbt-SwABY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Iyyo1BvtD06A5AONw_TF0YQe4oY2nQUqjkwiucWuPmOuRbsZcFAV1LGE-7n3d_EQl3v8opPbei',
    // Fists
    195: '3lFQIzHs4nxoZPN1B8fH0gL-77qMTXGka2PHfiKBTFtrSLFWPTrY_Tui5r-WRD2cSe4vEAsEL6MH-mNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXdH11i0g',
    // Shovel
    196: '31FFIi3u2HhSaeR-P86IxVKs97bcGXHzOzSXfnndRAk8RLpZM27e92GksOiWQmnIFegtEgkDf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq7eIFjrkQ',
    // Wrench
    197: '31FBOCf23nxSaeR-P86IkFL-8uSPRXajPWfGd3aKTwo5TLNYPGrZ_DGns-2cRW7LFb5_RF0Fe7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq6wRYg0dA',
    // Bonesaw
    198: 'y1FUJSz9znV6WultKszDjgT-p-OJSiWgPWCUeHffSgw-ReELMTzY-2KhtO6QS2yfFO8tEVgAdfMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOhN-kDxA',
    // Shotgun
    199: '31FFIi3s2mFjWultKszDjlz_-ebfT3ClPGbBfCSIH109SbBfMGyP_Geis-mXEzDMQbx9QQxRfaAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOq92s0m8',
    // Scattergun
    200: 'y1FFKSPsyXF_YvBiB8fH0gL-77fcTHWuOW-Vf3mBRA49TuJYMW6L9jut7LyUF2zPROguRwEMevZSpzBXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXIUfOVOo',
    // Sniper Rifle
    201: '31FFJCvo2GZ_bONgPfTKwRf8pKzeTnKmP2LGfXeATAhtGeFbYGzdqjug5-3GR26cEL59EA8BLvMN9TdAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5zLCpGFr',
    // Minigun
    202: '31FbIyzx2mFjWultKszDjl3_-LaOH3ela2DBLnbdTwk9GbNdPGDY-TLw4OqXSj_IF7skFwsBe6EasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeO0ZvHwkY',
    // SMG
    203: '31FFJyXH0XV_YuAibpvExAOp8rfbGiWjPWSUf3mORVowRLIKZmuP9zqmt-iTEDDIRu4sRBdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR4miCddzQ',
    // Syringe Gun
    204: '31FFMzDx03NoYvBiB8fH0gL-7-fVSy2ibmbHfXCLTQ0_SeEIYTze_Tus4-qQFmmfQrl-Q1tQdaYE82xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXbN748-U',
    // Rocket Launcher
    205: '31FEJSHz2GBhZPBiO8PD0jr3oPCKGTqkP2HBeneNSw05TLcKN2CI-Dui4uidED3PSbp-FVsEfvFVoWVLNcuKIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54peYqjIdj',
    // Grenade Launcher
    206: '31FROCf23HBoaeR5NsjOxRfEreOfG3G5OTKSKneJSl0-HLRYNmHbrGGs7bySEzjKReAtEFxXLKYN9GZMPcuOOAx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPWHBVvcAw',
    // Stickybomb Launcher
    207: '31FFPiv71m1vauhuB8fH1Qv4qeefI3j2ejDBYSDcSAppHOcNMG_Z_TWl5bvFQGvMRLp6RA4AKKQC9zIabMGLbUA90oQVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFIdA74rez-CB6rkxyyfDbeyOLcP5ZBWBlobH0u5myB-Cht9vqyPblwSsHgi8aaM75Pn8hDHDdo',
    // Flame Thrower
    208: 'y1FQJiP12GBld-p7Pdn5zATppufDRHGjODPFfySPGA5rGbFXZj7f_zSk4eiVQDrJRrslQwADf_EF8jVMa9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7in8YLEqDA',
    // Pistol
    209: 'y1FGIzHs0nhSaeR-P86IlwGq9rraRHX0MGHBeSLYTQtrSLFfMj7a-DL2sbucS27PEL5-EgoEfLxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq51VG8NlA',
    // Revolver
    210: '31FELzT30WJod9pgOdnBxUuj97DfSnX2OjTBf3bbTw0wS7cMPWzRr2fx4byQFzyfRe8rQl9SLqMM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPbRRf7Kp',
    // Medi Gun
    211: 'y1FbLybx2mFjWultKszDjgCo-LuOGHX2PGKdeiSKTA1qTbdaYG2L-2H3sO-XFmuYReB4S1sNKaMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOmrsC7No',
    // Powerjack
    214: 'y1FGJTX9z35sZu5TNMrUxwC187reHyekbTSVdiDcRFppTbYKNDnRqGKmsOzCFzyfSO8qRQEEe6pV-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFpVtWFnrg',
    // Degreaser
    215: 'y1FSLyXq2HV-YPdTNMrUxwC187XYTyKja27HfHLdS106SOEMMTyM_TGktu_ARG7NQrksFQxQdaoM93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFrugnh3UA',
    // Shortstop
    220: 'y1FFIi3qyWd5avVTNMrUxwC1o7DaSiekPzSQdnmARA5uHLYNMW6N_jXwtrucQjidQusoRwkBfPcM8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFqTQPfMmg',
    // Holy Mackerel
    221: 'y1FeJS7h0HVubuB-Pcf5zATppufDHXamMGTHLiKPSQs_TuYLMm7Z_TOg4byWETvBRuEvQwwDLqMB8TJJP9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7in8dXeDFw',
    // L'Etranger
    224: 'y1FaLzbq3HpqYPdTNMrUxwC1oLGLRXGhODaRe3OMGlo5ReJbNmmK_zWs7ejFS2zMFeslQwECfaoD8XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFpdBFKNdQ',
    // Your Eternal Reward
    225: 'y1FTPifq03VhWvdpL8rUxDr3oPCKGTqlMGOWeSfbT18xH7oNMTuKqjH05eiTFzGYQuEqRAsFdKUC-2JPPMyMIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pVGa_prS',
    // Black Box
    228: 'y1FUJiP71nZifdpgOdnBxUv-p-bbGS3ybmfGLieKHQ1qS7ZfYDrf_zr3tO3AETDAR7opRgBQf6MM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPfYp-1kn',
    // Sydney Sleeper
    230: 'y1FFMyb22G1SdulpPdvD0jr3oPCKGTqnPzSVfHDbRAhtH-VWNGraqzT34OTHR2ycEukpEglWf6dW9mxBNcjaIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pY3cxKk1',
    // Bushwacka
    232: 'y1FVOC374n9jbONpB8fH0gL-7-HVHSOiazTGfCOAGVw9H7tcZDzbq2HwtO2QS23OEO4vRwEFdaAG9GRXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXsz-Zz-M',
    // Gloves of Running Urgently
    239: 'y1FUJTrx03NSYuljLs7V_xDppueDH23IZDbWKCSXRQw_HOFWMGqM92an5OqVRTrIRet6QV0FK6cD-jcdaJ2IaRFrhYdYriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANEOUZs72IxPtJDztzJEeY08CFsjHbg8MjyfAvq0kH2cDOTha-EOs8dQBl9LSU7on3B7W0wsuq2PP1tE4Swm9KaRq9PwkIJgCtEZCA',
    // Frying Pan
    264: 'yWJaFTL500thZPdrPYWelwf69LDbSXegOzPCeHPfT1w7GOYLMD6L_jGn5LiXQDrKQ716RA8BY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Iyyo1BvtD06A5AONw_TF0YQe4oY2nQUqjkwiucWuPmOuRbsZcFAV1LGE-7n3d_EQl3vx6yRpJx',
    // Iron Curtain
    298: 'y1FfOC324nd4d_FtMcX5zATppufDSib0bGHGeSOBRQ9sG-BaMTvQrDem7O2cQj_AEOgkFQ0MKaMM9TJJNdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikmr4R27w',
    // Amputator
    304: 'y1FXJzLtyXV5avdTNMrUxwC1o7XbGiGhPWGVdiLaHVoxHrMKNGqPrzGm7bnAQDvKSespSgEBf6oA9XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFrrV5ZPew',
    // Crusader's Crossbow
    305: 'y1FVODfr3HBod_ZTO9nJ0xb5rvWyEHXlbzKKLSWATA07SbNXMm-M-jGntO6VEzjKFeguEltWKfQM9WYbOpvcbhM1gplLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CF18OFrxgM2rSB_rjkXnLCuO1aecJtMcBVFhPTku9z3F-XR1_va_dO19Atnol9rzS8ZqXY8KvAw',
    // Ullapool Caber
    307: 'y1FVKyD9z0thZPdrPYWVklf58-SIGHf0bGaQLHDcSwZsTOEPN2zR_TGi4umTFjHBEOwtF11XY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Iyyo1BvtD06A5AONw_TF0YQe4oY2nQUqjkwiucWuPmOuRbsZcFAV1LGE-7n3d_EQl3v0YR7VXZ',
    // Loch-n-Load
    308: 'y1FaJSHw03hiZOFTNMrUxwC1-LLUGiSiODaRK3OORVxuT7EMYD2L-zal4--dSzCYR-B-QgsGL6cAp3oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFpA187RUg',
    // Warrior's Spirit
    310: 'y1FULyPq4ndhZPJTNMrUxwC1-LSPHiGhbWHAfXmJSwxqTrNaPW3e_jKs5OWQRm6dRb0rFwgDe6AH-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFryVtT43Q',
    // Brass Beast
    312: 'y1FRKzb01HpqWuJ5NvTKwRf8pKzeHS3zMWaTd3mBHltqHrEKMD2K_zWjtLiRFDDOFL0pRwgGdfcH82wcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e54HcTtDJ',
    // Candy Cane
    317: 'y1FVKyz8xEtuZOtpB8fH0gL-77XfGCTxPzKUdiSNHgptG-VZN2GLqDunse3BSj3KSL5-EgANeKsApjFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX5xBqIn4',
    // Boston Basher
    325: 'y1FUJTHs0npSZ-R_MM7U_wn6s-WIUieuPjTALXXfRAo9ROFeMD6NrGX3trnCFmrAROolQFpVe6IFpjBPNcCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxIKqZaF0',
    // Back Scratcher
    326: 'y1FUKyHz4mdud-R4O8PD0jr3oPCKGTr1PG_HK3eITFo_S7BZNTnRqmKhtrudEDyfEut4RQAEffEApmMYaJjfIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pePjXJQD',
    // Claidheamh Mòr
    327: 'y1FVJiPx2XxoZOhjMMbJ0jr3oPCKGTqkPzaVenCLGgwwSeFcNGHa-TrztOrBSznIQe8uQ10CeKJQoTYYPJqLIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pbDCf-sg',
    // Jag
    329: 'y1FcKyXH0XV_YuAiPsqQmFyv8OTaGi32MGDALSPdSg04HuFXZjvb_jKntO-SSznBSOwrQhdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR4NzGxwnA',
    // Fists of Steel
    331: 'y1FQIzHszktiY9p_LM7DzDr3oPCKGTrxP2OQenaMRAw6SbcLZG2K-WWl4u-dSzrLSLwtElhSffQNo21BO52JIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pdGTQDQG',
    // Sharpened Volcano Fragment
    348: 'y1FEIyTs4nJkd-BTOdPD_wn6s-WIUnakamXBLnGKRQs-GbdYPGzZ_2agsOmRR27PSO8pQApSK6FX9TJNOsiXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxz5y3x9o',
    // Sun-on-a-Stick
    349: 'y1FEIyTs4nJkd-BTNcrFxTr3oPCKGTr0ajWRenbcGQ86SOFZZmyM9zOg7euUQDDJSeElQgEFeqZVoWJANJ_aIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pbbeVe25',
    // Detonator
    351: 'y1FSLzb303V5avdTNMrUxwC1oLWPHSXzMWKTe3eKSlppSLZaMWDZ-Dui5byRQDvASLp6FQoEdPBS8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoV8KI8zw',
    // Fan O'War
    355: 'y1FFIi3_yHpScuR-PsrI_wn6s-WIUiOjbmWSdnLfTV87S7sLMGHR-mCi5uuXRDrOSeAvQggMeaBVoDFLaJ2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxyQPUQLQ',
    // Conniver's Kunai
    356: 'y1FFIi3_yHpSbvBiOcL5zATppufDGCL2OWWdfXbdGQZtRLVfMj3R-DPzs7nFS2rLSLwoFQFRffYHpjdJbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7inXhNloEA',
    // Half-Zatoichi
    357: 'y1FFIi3_yHpSbuR4OcXH_wn6s-WIUiH2OmbAfnSKSAk6TeIKMmjYrzKlsLvBF27LQLp9FggGfKUE-2RJacGXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBx6rr-ecU',
    // Shahanshah
    401: 'y1FFKSv11GBsd9pgOdnBxUuuo7fURXH2bGaRKieOTl87H7tYND2Mqzqk5rvBQjHJQbssEAhQf6sC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPW-ANHwz',
    // Bazaar Bargain
    402: 'y1FUKzj53GZSdutlKM7U_wn6s-WIUiXzbTTCf3COSwxpTrUNMm2P-GWs5ruQQTnNFLp-RlhQKasM82Eaa52Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxecNUqYw',
    // Persian Persuader
    404: 'y1FSLy_34md4afFtNvTV1wrppd2BHWbwbXmSKnCBTlwwHrcKZGDRrDDz4OuSQ23PQOgqQQ1XfPYA-mVLOMmNPhc8ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcxGkwbFPcoZjrSV_21xC3MXuTkOeFY45BTVgweTk_pnnEpWx98vv2IOA1GtH0i7OLM-As58GQp',
    // Splendid Screen
    406: 'y1FGLzDr1HVjWvZkMc7KxDr3oPCKGTrxOzGQLHPbGVhsG-JaYD7e-mLx4-idF2vISLsuQQsFLKRQ82JBOc3cIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pU6Uk9Bs',
    // Quick-Fix
    411: 'y1FGOC3s0ktgYOFlP97I_wn6s-WIUnf1a2SceXTYRAg-SrVXNjyP_2L0s-6TQ2vLELx4SlgGdKYA-mFPb8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBx2tqxUB0',
    // Overdose
    412: 'y1FGOC3s0kt-fPdlNszDxxD1nu6MDnPyJmfBeXWAGgsxSOVYNG3e_jHws-_HFGnLQu0pFwgHK_AN-2RJb5qIahAjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzFAOSCnVo',
    // Solemn Vow
    413: 'y1FeIzLo0nd_ZPFpK_TE1Rbvnu6MDnPyJmHFeXfdGVg7RLUMN2zQ-mGjsO7FET-fR-8oEQ1VKKJR-2VJbsjbNhYjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzF27UFEmY',
    // Liberty Launcher
    414: 'y1FaIyD9z2B0WultLcXFyADpnu6MDnPyJmDAdnKATFhqSOZXNznf9zah4LiVFzHMRL0pRQoMevFQ9WwfbpqIOxUjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzFqmKHKN0',
    // Reserve Shooter
    415: 'y1FELzH9z2JoWvZkN8TSxRfEreOfG3G5P27FfiPaSw8-HrNbMDmL9zX04OjCSzCaFLwlS10GdKcC9mxNOsqNawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPUItzg8Uw',
    // Market Gardener
    416: 'y1FbKzDz2GBSYuR-PM7IxRfEreOfG3G5PmSVLXWNSQxqG-BbZm2MqzT05unFED3LR-goRAEAfvdW92IfacDbPQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPUz09QUrw',
    // Tomislav
    424: 'y1FCJS_xznhsc9pgOdnBxUuipeDeGCz0bmOXdnHbSgpqS7ENYGve_DPxse3GFj3BQb4kRl8GfKMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPYcD5Ckh',
    // Family Business
    425: 'y1FEPzHr1HVjWvdlN9_5zATppufDTy3xaWKXfCXdHVhrTrIPYDvb-mDz4biVQTvKRL0sQ1sCfaNQpjVKONfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikT1rOWGA',
    // Eviction Notice
    426: 'y1FTPCv7yX1ia9piN9_PwwDEreOfG3G5PjXAeXXdHgY-G7JeMWGM_TGm5O-RQmycQbouRFwNKKsFoDcaaZ2BbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPXogofKmg',
    // Cow Mangler 5000
    441: 'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pb3U0GMp',
    // Righteous Bison
    442: 'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CF18OFrxgM2rSB_rjkXnLCuO1aecJtMcBVFhPTku9z3F-XR1_va_dO19Atnol9rzS8Zo0wObqDw',
    // Mantreads
    444: 'xW9YPjD93HB-WultKszDjlypp7GJGnD2bmfBfSONTQdsGbcKYTzcqGD25bmVE2vMQuApEABXefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOZvZJQJk',
    // Disciplinary Action
    447: 'y1FEIybx03NSZvdjKPTKwRf8pKzdT3DxbWaVeXeARAZuGbYNNDqM-DTw5umTRj_AQeksSw8DffdW8jYfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e504r7i68',
    // Soda Popper
    448: 'y1FFJSb54mRidfVpKvTKwRf8pKzVRCCmP2GSfHGAS1o7TeYNNmyKrWbz5-WXETCbQ-orFVwFKKIE9mxBI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5zPhBXYn',
    // Winger
    449: 'y1FBIyz_2GZSdex_LMTK_wn6s-WIUnGmaTXCdnncHwkxGbBXPWrcqDGit7-QQGzOQu8pSw9QLKVV9GZPbsuXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxCXTkEgk',
    // Atomizer
    450: 'y1FUJSzz4nZscdpgOdnBxUuj8ubaGXClMGLHKiSOGl09GLFYNmzc92Wg4unGFm7JQO14FV9QLvcF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPTzYo7qt',
    // Three-Rune Blade
    452: 'y1FFKS3tyUt-cup-PPTKwRf8pKzVSnKgam-SLCDcGgxqG-APMTmPr2ass77BET3OEukrQl0Af6AF-zEYI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e58ir5qWn',
    // Postal Pummeler
    457: 'y1FbKyv033t1WultKszDjgP4-LSMTXahPGTCfiKKTlg6G7INYWiP-Wen5OicEDifF7ovF18FefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOxI0yhTw',
    // Enforcer
    460: 'y1FFJDf64npiduBTNMrUxwC1-bGMGiyiO2LHdiCBTw49RLcMMW7brGGh5LyTEzjIR-p6QwhSePYCoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoqSEko3w',
    // Big Earner
    461: 'y1FFPSvs3nxvaeRoPfTKwRf8pKzfTXemazaSeXbaTFwwH7BYYzzb-mXw7emSEz6cE7x6QV0HKfZV8jdPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e55S1ofkh',
    // Maul
    466: 'y1FELCPH1XVgaOB-B8fH0gL-77TeTnL0OG6XLHDfTAtpRLtfPG6M9mGmsO2cRDmbQ7woFwANf_QApmxXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXcX-TvE8',
    // Conscientious Objector
    474: 'y1FGIyHz2GBSaeR-P86ImFyu97OOGXKuPDOWfnWOT1xsRLENYT6P-jqgs7jHRj-fFbx4RlwGfrxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq5MpzP4JQ',
    // Nessie's Nine Iron
    482: 'y1FRJS7-3nh4Z9pgOdnBxUuu8LXdRCLzbGOdfCWJRQs9SeILMmCK-zX07ejGQT7PQukpS18Df6dR7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPcSHd7kr',
    // Original
    513: 'y1FULzbHz3tubuB4NMrTzgbzpPCyEHXlbzKKeCLfTA4wSLReNGze9zaj5riWFz_MQ-l5RgBVKaIG8G0dOJrYbRI1gJlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CF18OFrxgM2rSB_rjkXnLCuO1aecJtMcBVFhPTku9z3F-XR1_va_dO19Atnol9rzS8Zr0bT06Uw',
    // Diamondback
    525: 'y1FSLzrHz3F7aul6Pdn5zATppufDTy32aW6SKnLdS1o7S7tXPWja9zT37LjHRz_BR7soFwtReKpS8DVLOdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7imlXLenxw',
    // Machina
    526: 'y1FSLzrHznpkdeB-KsLAzADEreOfG3G5bTSVf3PbHlxuSrtaN2ra-jL2sbvAFD6aFb55QA4EK_ZWpzBLaMqAawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPWIUJLbZw',
    // Widowmaker
    527: 'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e52iUnj4K',
    // Short Circuit
    528: 'y1FSLzrH3GZgWultKszDjlSroOeLGHKuOGGReCDbRVw4G7JWYG-N-jWj5b-cFz7PRekkFwkAe_casjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeOgvzUpQs',
    // Unarmed Combat
    572: 'y1FDJCPq0HFpWuZjNcnH1Dr3oPCKGTqgPmCQe3SLRFxrH7FeYW2I_Tqn4eucET2YRO8tF19QevQDoDVAPMmIIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pVzLu5Sy',
    // Wanga Prick
    574: 'y1FAJS380ntSdexiB8fH0gL-77PYTSX2bG_HKnmJSgs5RLcKZ2Hf-zCj5bzBETrLF7wkFQxQevYF8GZXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXMOzXEag',
    // Apoco-Fists
    587: 'y1FFOHHHzWFjZu1TNMrUxwC1pLqLTSL1OGfCf3fYGQdsHLEPNj2N9jPztruTSzHOFex6RAkEeqcE93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFqRfH8pGg',
    // Pomson 6000
    588: 'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXMAbiKoM',
    // Eureka Effect
    589: 'y1FSOCXHymZoa-ZkNcTS0gr1nu6MDnPyJmDFLCPcSww9SLRXMDnfr2Ws4rnBQzybSbwuEQkGevEE9zVMOc3YbRIjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzFlnPB8ww',
    // Third Degree
    593: 'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPWVkYZouw',
    // Phlogistinator
    594: 'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CF18OFrxgM2rSB_rjkXnLCuO1aecJtMcBVFhPTku9z3F-XR1_va_dO19Atnol9rzS8Zp4qYzNwg',
    // Manmelter
    595: 'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxRV9AonY',
    // Scottish Handshake
    609: 'y1FFKS3s0XVjYdp_MMrUxDr3oPCKGTryPDOTeieNSV09HrpeMDzd_juh4OyURW2bQuEoQw0MefNR8W1IbMDYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pTZli03L',
    // Sharp Dresser
    638: 'y1FXKTDH1XtibudgOc_D_wn6s-WIUnXxbmGReHeLHgY6SbJdZGnf_Drws76cQz-cROwrEAwEf_FSpjcdO8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBx1ixgCvY',
    // Wrap Assassin
    648: 'y1FOJzHH2n1rcfJ-Odv5zATppufDTiakbWeULSWPSlhsT7ZYNTzf9jb37L6cETjPEuElQgkCeKMG9jBLbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7inLpYlGZg',
    // Spy-cicle
    649: 'y1FOJzHH3nthYdp_MMTTzAH-s92BHWbwbXnGKnaJHgk-ROVaMWCL9jL0s--WEDDKQO9-RgAHf_RV92dINc2NPRY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcxGkwbFPcoZjrSV_21xC3MXuTkOeFY45BTVgweTk_pnnEpWx98vv2IOA1GtH0i7OLM-MO-Dttu',
    // Holiday Punch
    656: 'y1FOJzHH2nhic-B_B8fH0gL-77HeSHKvbTXFKXeBGAwxS7cMNDne-Dqi4unCEz2cQugvFg4DffAF-m1XfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXoCUcdOs',
    // Black Rose
    727: 'y1FXPCPHz3t-YO5iMc3D_xPEreOfG3G5bW6TfnndSAk_H7oKPGDdqjf2seqdQjzPFLx4QQkDfKANoTUfOp2OOgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPW2zqsmVQ',
    // Beggar's Bazooka
    730: 'y1FSPy_ozmBod9poPd3PwwDEreOfG3G5aWHFeyOMGQZpSeJXMGCMqGX0t7icRGvJSOEtQwpSdPAB8WNIP8vbbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPU2DYbSHg',
    // Lollichop
    739: 'y1FaJS701HdlavVTNMrUxwC187CITXenPmGVLHaPRVo9T-ZcNjuMqjDxsOTFFD6YSboqFwoEdfYC93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFoJleEoNQ',
    // Scorch Shot
    740: 'y1FFKS3q3nxSdu1jLPTKwRf8pKzbHnWgbjSRdnaNRQpqTrNXPDvb-DP25b-URT3NQL0qRAwEf6QApmIfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5z7I_3B4',
    // Rainblower
    741: 'y1FEKyv233hicuB-B8fH0gL-77bYHXGhO2aWf3CMTA06H-VePW6Krzus5buVSzvIELwqEV0BeaFS9TdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXtNsQyno',
    // Cleaner's Carbine
    751: 'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeONi33NV0',
    // Hitman's Heatmaker
    752: 'y1FGOC3Hz31raeBTNMrUxwC1o7LaRXHyOWfGLSfbRVxrG7pZNGzf-zumtL7HFD_ISb4pSwkMeKtV9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFqYGHD2hw',
    // Baby Face's Blaster
    772: 'y1FGLzLHzndscfFpKszTzjr3oPCKGTqmMGTHfiXbGgc-G7ULNmjbq2as7OWUQz7BSLl4EF8GKfMN9TBPOMiJIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pU8h-GtT',
    // Pretty Boy's Pocket Pistol
    773: 'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMX1WmPrgQ',
    // Escape Plan
    775: 'y1FGIyHz3GxoWultKszDjlSs8ObYTC2mMTKWeiXbTgprGOEPMmzb_GCn4OmRFDHIQLx-S1gEKfEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479JNHqZn39QsQaItuT1xLEr1-Yj-HVKjhkn2ZC-e2P7UM4JMEAQxMTh7vm3J_DE03qKeO9YuTTjw',
    // Huo-Long Heater
    811: 'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq4_Qq1f9A',
    832: 'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgBx55UvJu8vV5AaNtpGQkfFel5M2-BBf-2wH_NWueya-QMt5UGAg8eGx29nXB4C1dptq4_Qq1f9A',
    // Flying Guillotine
    812: 'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXRiL1NZU',
    833: 'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhJLzqQpGJY5uGF1PRbt5Nj2BU6_hwy-eD-CzauUN5ZVVUgtOHBrrnyUpD08t6_3HKlMXRiL1NZU',
    // Neon Annihilator
    813: 'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56AgoO6U',
    834: 'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e56AgoO6U',
    // AWPer Hand
    851: 'y1FVOSX34nV6ddpgOdnBxUv5-LPUGHWkMWWTKSWNSQ89TeBWY2GL-Gfws-zFRj3KRr15EA9VKPAC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPfhOa_U1',
    // Freedom Staff
    880: 'y1FCPR393HNhYNpgOdnBxUv_pbGJTiKiMGeTf3GLGQ44RbYPNWve-Dr2sbidRzHBQ7woRAkFfPZW7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPcbTi5_Y',
    // Bat Outta Hell
    939: 'y1FFITf00XZscdpgOdnBxUv4oLfYHnL0MWWReXjbSgw7GeVdMmrbrTOltOSVRD7JQ-96SgEMfvFV7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPexBMvvm',
    // Loose Cannon
    996: 'y1FSLy_34ndsa-tjNvTKwRf8pKyPHi3yam_GeiXaHl9qHrJYZmHYrDGj4-SQS27IEuwkEg8AK_QNoTYdI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e5zWlpsJk',
    // Rescue Ranger
    997: 'y1FCLy794mdlavFrLcX5zATppufDTifxajaRfnmATwg8H7VfN2nf_TKj7O2XFzzLErl6QwsCL_cG8TdJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ikI3orWCQ',
    // Vaccinator
    998: 'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPWjZjiD8w',
    // Ham Shank
    1013: 'y1FeKy_H0XV_YuAiYJKfwlOv9bOMGiDxPTKReXmAGls7TeVZMmmK_DWisOrHQDCdSO8rShdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjUpwszJoIvc3xuF4Xad8-Hw5LF-9-NG_QV_iyx3qYCua3bbVfsJdUBgsaTEu-n2o7UR7N8wq-Lw',
    // Fortified Compound
    1092: 'y1FUJTXHyXxkYONTNMrUxwC18-PVTHKlOWaSeXSPRV0xSLsLZmGN9jantOqTFjjPSb5-Fg9SKaQH93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFqyXSboUw',
    // Classic
    1098: 'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPUgtbJ0Sw',
    // Tide Turner
    1099: 'y1FBIif90Ut-bexpNM_5zATppufDTyylamaTLXbaGlg-S7FZNGDaqDCj4rmXSjnBR70rElgDeqBW92cfOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7ilIdICHPw',
    // Bread Bite
    1100: 'y1FUOCf52Xlia_Z4Pdn5xwn0t-eeI3j2ejDBYXDbGAg9H-JWMW3bqzL34ezGETHBFL19F10BKaYHozYaOsDcbRtu3dEVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JFIdA74rez-CB6rkxyyfDbeyOLcP5ZBWBlobH0u5myB-Cht9vqyPblwSsHgi8aaM75PniYWV6UI',
    // Back Scatter
    1103: 'y1FFKSPsyXF_Yfd5NfTKwRf8pKzYSyOiOWOcKXKIH1ttTrpdYWGN_Teh5L6SRW3BFe0lQg0MKfQCpGFLI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqH-uh9EbsY7SF0fQu0sYjrVVP6xxX7JWLKxPrQN4cEEUlxIHhnozXAqXUkv7PrddE0e59qKbagh',
    // Air Strike
    1104: 'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hAFCeY84VVhPErp9YTuGB63nxCieXrK0buIIsMVUVw0fTx3pzSEtCxh76P_daQle8CBxEog_sIQ',
    // Necro Smasher
    1123: 'y1FVKzD21GJsadphOcfKxRHEreOfG3G5OGWWf3HbHwdtG7dfZGzf_zSssO6RRjDPRO4rSgwHK6UBo2cYOZ3baQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPX4rRQosQ',
    // Quickiebomb Launcher
    1150: 'y1FdIyz_0HVmYPdTK9_Pww7inu6MDnPyJmCVLHWKRAxrRbpWNzvYqjWgseTCQzvBQLwrSwhRe6RV8GxObsvYPEMjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVIQ8CVkZX799NjqCUKvgkCqYWbW0P7APtMJRAl0eShu4niYvWRx_7KiLagtEs3o4svzF4L7S2oo',
    // Iron Bomber
    1151: 'y1FHPyP833VhadpgOdnBxUv997bYRHCkamCQLHWBTl1uGLRfNzuN-2ah4-nGSmuYF7p6QwkFdaMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPXomeND4',
    // Panic Attack
    1153: 'y1FCOCf23nxqcOtTNMrUxwC19OaOGS2hOWaXfHLdSQc_SbBYYTrYqDX0t-iUET-fR-5-FQ9Re6YCpnoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFpu2LbFEA',
    // Dragon's Fury
    1178: 'y1FQJiP12HZsaelTNMrUxwC19uaMTCyhPTaRLnSKTQ9rSLMKNWDdqGemsLjHRDCfFLokQg8HfKUF9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5t5_gvAgNbds-GA1IE-4tMWmGAv_nknjJXeLnO-UJscRVBQ1MHxm5yiZ7CU0q7OeZNFogjgnKEA',
    // Hot Hand
    1181: '31FFJiPozX1jYtprNMTQxTr3oPCKGTr0ODbFdySASl9rG7JcMGzZq2eituTFRGmYQOouRQ1WfacC9TZJPJ-KIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJPapo6HhAaQrotZm3TU6qzw3nOWOPjObAK5JRUU1lOT0rvzyIuWU14uvnfbg5Erj54pXh2v_k6',
    // Shooting Star
    30665: 'y1FfJDT5zn1ia9p_NsLWxRfpqOSBGUv7aSXDKm_YH1s5SuELZmuMrzrzsL_CFGvLF-p5Sg4NdaQApmBJPJ_caho80NEC5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdX9MTWJgt2JZJtZ_-hApRbokuHmEQEKspMHfXV6q0wHrKWbDmP-Zf48EBUQgZSxq5n3QvCkx7vK-MPAkR4n4g9qGWsY3umYGayLcp',
    // C.A.P.P.E.R
    30666: 'y1FfJDT5zn1ia9p8MdjSzwnEreOfG3G5OTLFfieAGgcwSrddZ22I_2Ggt7vFFj-aQrsrFQ4Ce6sN92VBNMrabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8Z4kvHFtSF-otNmqFBv60l36fCOWybudY5sAFU10aHkq4ySAtWh8tuavZbAlDtGBmrPVZFtZhjQ',
    // Batsaber
    30667: 'y1FfJDT5zn1ia9puOd_5zATppufDHyL0amWReniJSFg_HrYINT7Q_jH34L-QFDufRbssElgCf6MG-zAaOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNtwxRbI1zHQ0fEup6N27SAPnglXiYD-XjPOBc4cVQA1wfGBvrziJ_Xhsp7v3abhMA7inKI5ZAtw'
};

const ks3Images: { [target: number]: string } = {
    // Professional Killstreak Kit
    // Kritzkrieg
    35: 'y1FZPCfq1XFsaeB-B8fH0gL-7-OISHauPTOUeiDYRQ1qTOBaN2vZ_jSt5eWVEGnKQu0rRwwFfqIE92xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWuN_4KQA',
    // Blutsauger
    36: 'y1FaLyf71XN4a9pgOdnBxUv5ouHaTS31bmDCd3iBH1g_SeINMj6Ir2H3sbiTE2rJQ-4oR1sHe_AF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxJ7dIt4k',
    // Ubersaw
    37: 'y1FDKCfqznV6WultKszDjgSsp7GMSy30OjPHfSeLT1g4GLZeM2iL_TTx4OWVETmfQb0lFw8BfvQasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ikXVbgfWw',
    // Axtinguisher
    38: 'y1FXMjbx03N4bPZkPdn50Bzprt2BHWbwbXnHeXbfGQ0wSOdfZDnc_mWssb-cED7JQeksQwgNevFXpm1PbMqANhA_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcvGkwZLrUvJz7USvrjwCqcDOO1OeMA4sJYVlgZTk20nyYpW04uuf_fbAVH4X918_eT-5mujou4q1NKmYk',
    // Flare Gun
    39: 'y1FQJiPq2HN4a9p8IdnJ_wn6s-WIUnGhPmSVfXSNGgo6TLNZY2iP_Tuk4r_AQTrISO8tFw0CfPRWoGUbbsyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZpxM4sKfw',
    // Backburner
    40: 'y1FUKyHz32F_a-B-B8fH0gL-77SIGCDyOG6VfHGJSVwwGbdWN26I9zun4-rHSzGcSespRVhQf_MGpmFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWAm3bf0A',
    // Natascha
    41: 'y1FBFS7t2XlkaeRTNMrUxwC187aLS3WibGWdfHbaRVxrHrpdNWqMrGL37b-QR2vPEroqFQ4HLKtR8HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pb8j2Dlv',
    // Killing Gloves of Boxing
    43: 'y1FUJTrx03NSYuljLs7V_wn6s-WIUnegaW6TdniBGVhsSrNaMWDc-TDw5rnARmufROl5R18GL6FX8WAdacCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZrKD5xpvg',
    // Sandman
    44: 'y1FBJS382HpSZ-R4B8fH0gL-77aMHS2nMTOWKXPfS1xqGLQLYTnZ-TLx4u-cRmvNEuouEV9XdaZQ8jJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWoXARMWg',
    // Force-A-Nature
    45: 'y1FSJTf60XFSZ-R-Ks7K_wn6s-WIUi32amScLniNTlpuH7dWPW7b9meltunAEDCbQb0pSl9ReKVWozVMbJyXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZpsxfpcDQ',
    // Huntsman
    56: 'y1FUJTXH0XV_YuAiapvFkFKq87TaGCajOWWceiCOTw08TbddNj6M_2WhtL6SQzvMFO1-FRdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPbwNmEcO',
    // Ambassador
    61: 'y1FXJyD5zmdsYep-B8TW1Dr3oPCKGTrzOjXALXSNSAtqRbFaNGvdrDDw4-vBFzjPQewpRgxSfqsBpzUaNM6AIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75Pn-Lry_Gk',
    // Direct Hit
    127: 'y1FSIzD93mBlbPFTNMrUxwC18rOJS3GhOWfHK3fdRVw5TuBeYT7f-Tf34buXRjybQOkvQAkHf6ED9noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54patYk1xD',
    // Equalizer
    128: 'y1FGIyHz3GxoWvY-B8fH0gL-77vbH3LyOmaWKSWPHwlpH-FXMGGM-2Wj5urGQTydE-h4Rl8NfqVRo2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWCpuOO0w',
    // Scottish Resistance
    130: '31FFPiv71m1vauhuB8_DxgD1peefI3j2ejDBYXTcHg08RLBfPGqK_DSt57idEzjKSLp_FVxSLqsMoWEbaJuJPENv3YAVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JEwdA7wROTjDA6z5wHqbCufgP-YP58hXVFEbS0y5mX1_XRt97_6IbAtGuHl38_GT-szkmsuvERcrcw85WQ',
    // Chargin' Targe
    131: 'y1FCKzD_2EthZPdrPYWexFf58ObbTnCnbWOXLnKJT1puReVbNW_Yqzf04uyUF2ybRbt6F18AY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Isyo1DhJLzqQpGJdtpSFpIE-l5Y2uIU_rvwn-bWuG7O7NbscZXBl8cTEe6ynUoDhwovK3HKlMXQXuU-Ac',
    // Eyelander
    132: 'y1FVJiPh0Ht_YNpgOdnBxUus8LGPSiKgOGSUenmJRAg9RLNfYGyI-Gbw5evGS27BSbt-Q1gEKKsF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxZeldLTc',
    // Frontier Justice
    141: 'y1FQOC32yX1od-95K9_PwwDEreOfG3G5am6SfSOJTFw5TecLZ2HYqjGk4-XBQGvIFOwvEV9QeaJV8mZKO8vabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umT6ylaQx',
    // Gunslinger
    142: 'z3tYOS7x03Nod9pgOdnBxUuvpOaISyfyO2XHfHaKSlxuTeIINWyLqmb04u_CQD7BQuEuQlpQKfYF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxZTLtpM0',
    // Homewrecker
    153: 'y1FFJif82nFlZOhhPdn5zATppufDHiKmP2CXKnGMGA09ReIKNm7c_Tui7OuXFmqaQL4oSglXfvMGoDFJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-K4tlfC2',
    // Pain Train
    154: 'y1FGKyv2yWZsbOtTNMrUxwC1pbXYSnfzMG6cdnOIHgo_GLdcNWuKr2WjtruSQmqdQrkkQQwNf_QF8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pUX6antM',
    // Southern Hospitality
    155: 'y1FFOivz2GN_YOtvMPTKwRf8pKzZRCXxOW_AKXSOGQc-TbAPNDnd_jb0s-uSETvJQ7ouEV1WK6tVp2IbI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFNpKuHUQ',
    // Lugermorph
    160: 'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFKp7R8Mg',
    // Lugermorph (second one?)
    294: 'y1FCPiXH0HV1WuJ5NvTKwRf8pKyMGnD2OmOVfHePS1s6HrteZGHf-WCg7LiTQG6bELt4EQ1QL6cB9mEfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFKp7R8Mg',
    // Big Kill
    161: 'y1FCPiXHznVgWuJ5NvTKwRf8pKzfSCOuOmPCfSCMGlwxG7ALMmyK_TLx5-qSSj_JFLwoEV1Qe_cM9TFPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFqxwfTLE',
    // Tribalman's Shiv
    171: 'y1FBJS384nlsZu1pLM75zATppufDSXGua2OTKyXbTgY_TbFbYW_d_jPw5u_BRTrBQOF6F1sMLqBV8GBBaNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-BJgg0Px',
    // Scotsman's Skullcutter
    172: 'y1FUKzbs0XFsfeBTNMrUxwC19LvYS3euMTGdfnjcHVg_TuVaY2yIrDXz5uyXF23IE74kFQ4GfaVRoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pSNQLzUS',
    // Vita-Saw
    173: 'y1FDKCfq03FoYelpB8fH0gL-77XVHyX0PG7CdiOKHVtqG7cKM2mK_2Gt4-_BEz-dEOp_Q1gGf6sE-2NXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWHtsFD6g',
    // Bat
    190: 'y1FUKzbH0XV_YuAiPJuVlgf-87HYTHGjP2DAKyOKTAs_S-FaNDrR_WKj4-uTETjLE-gkERdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPdYmIp1Z',
    // Bottle
    191: '31FUJTbs0XFSaeR-P86IlFH99LWOGCLyMTKcLHiORAxqTrZfNWDe_mb35u2SRGzISL4kQg0GdbxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e5yO7TuUT',
    // Fire Axe
    192: 'y1FQIzD93GxoWvV1KsT5zATppufDHnGgMG-UfiTdRFpuSucNYWndq2Gt7LiUFm2fQ-8uRwkMfaMG8mFINNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-BgCmh7p',
    // Kukri
    193: '31FbKyHw2GBoWultKszDjgT5-LLcSSCvODSRLXXaGFhpT-JWM23e-TSg7bnCRm2bQbsqFQwCffYasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7im8Fqi5ew',
    // Knife
    194: '31FdJCv-2EthZPdrPYWUkgf6-OOLGSHzOmWSeSWKGAdpG7MIMjyKqDqsseuTFj3BSbt-SwABY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Isyo1DhJLzqQpGJdtpSFpIE-l5Y2uIU_rvwn-bWuG7O7NbscZXBl8cTEe6ynUoDhwovK3HKlMXpGBfv1I',
    // Fists
    195: '3lFQIzHs4nxoZPN1B8fH0gL-77qMTXGka2PHfiKBTFtrSLFWPTrY_Tui5r-WRD2cSe4vEAsEL6MH-mNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVJ_DwCJQ',
    // Shovel
    196: '31FFIi3u2HhSaeR-P86IxVKs97bcGXHzOzSXfnndRAk8RLpZM27e92GksOiWQmnIFegtEgkDf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e52L2MIm2',
    // Wrench
    197: '31FBOCf23nxSaeR-P86IkFL-8uSPRXajPWfGd3aKTwo5TLNYPGrZ_DGns-2cRW7LFb5_RF0Fe7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e53-nnEBg',
    // Bonesaw
    198: 'y1FUJSz9znV6WultKszDjgT-p-OJSiWgPWCUeHffSgw-ReELMTzY-2KhtO6QS2yfFO8tEVgAdfMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7inlnFaFvQ',
    // Shotgun
    199: '31FFIi3s2mFjWultKszDjlz_-ebfT3ClPGbBfCSIH109SbBfMGyP_Geis-mXEzDMQbx9QQxRfaAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ikU6heOYg',
    // Scattergun
    200: 'y1FFKSPsyXF_YvBiB8fH0gL-77fcTHWuOW-Vf3mBRA49TuJYMW6L9jut7LyUF2zPROguRwEMevZSpzBXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPWV_gHUhQ',
    // Sniper Rifle
    201: '31FFJCvo2GZ_bONgPfTKwRf8pKzeTnKmP2LGfXeATAhtGeFbYGzdqjug5-3GR26cEL59EA8BLvMN9TdAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFTaguNug',
    // Minigun
    202: '31FbIyzx2mFjWultKszDjl3_-LaOH3ela2DBLnbdTwk9GbNdPGDY-TLw4OqXSj_IF7skFwsBe6EasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7inJweLAnw',
    // SMG
    203: '31FFJyXH0XV_YuAibpvExAOp8rfbGiWjPWSUf3mORVowRLIKZmuP9zqmt-iTEDDIRu4sRBdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPd8cFe-V',
    // Syringe Gun
    204: '31FFMzDx03NoYvBiB8fH0gL-7-fVSy2ibmbHfXCLTQ0_SeEIYTze_Tus4-qQFmmfQrl-Q1tQdaYE82xXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPXNFeROog',
    // Rocket Launcher
    205: '31FEJSHz2GBhZPBiO8PD0jr3oPCKGTqkP2HBeneNSw05TLcKN2CI-Dui4uidED3PSbp-FVsEfvFVoWVLNcuKIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnImLOu10',
    // Grenade Launcher
    206: '31FROCf23HBoaeR5NsjOxRfEreOfG3G5OTKSKneJSl0-HLRYNmHbrGGs7bySEzjKReAtEFxXLKYN9GZMPcuOOAx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umVPLaNtI',
    // Stickybomb Launcher
    207: '31FFPiv71m1vauhuB8fH1Qv4qeefI3j2ejDBYSDcSAppHOcNMG_Z_TWl5bvFQGvMRLp6RA4AKKQC9zIabMGLbUA90oQVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JEwdA7wROTjDA6z5wHqbCufgP-YP58hXVFEbS0y5mX1_XRt97_6IbAtGuHl38_GT-szkmsuvERd9HXYLWQ',
    // Flame Thrower
    208: 'y1FQJiP12GBld-p7Pdn5zATppufDRHGjODPFfySPGA5rGbFXZj7f_zSk4eiVQDrJRrslQwADf_EF8jVMa9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-AmSwu1Q',
    // Pistol
    209: 'y1FGIzHs0nhSaeR-P86IlwGq9rraRHX0MGHBeSLYTQtrSLFfMj7a-DL2sbucS27PEL5-EgoEfLxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e53vojYqK',
    // Revolver
    210: '31FELzT30WJod9pgOdnBxUuj97DfSnX2OjTBf3bbTw0wS7cMPWzRr2fx4byQFzyfRe8rQl9SLqMM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBx_bq4rV4',
    // Medi Gun
    211: 'y1FbLybx2mFjWultKszDjgCo-LuOGHX2PGKdeiSKTA1qTbdaYG2L-2H3sO-XFmuYReB4S1sNKaMasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ilKNud5gg',
    // Powerjack
    214: 'y1FGJTX9z35sZu5TNMrUxwC187reHyekbTSVdiDcRFppTbYKNDnRqGKmsOzCFzyfSO8qRQEEe6pV-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54peRawaia',
    // Degreaser
    215: 'y1FSLyXq2HV-YPdTNMrUxwC187XYTyKja27HfHLdS106SOEMMTyM_TGktu_ARG7NQrksFQxQdaoM93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pcoRdN3C',
    // Shortstop
    220: 'y1FFIi3qyWd5avVTNMrUxwC1o7DaSiekPzSQdnmARA5uHLYNMW6N_jXwtrucQjidQusoRwkBfPcM8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pYElYnId',
    // Holy Mackerel
    221: 'y1FeJS7h0HVubuB-Pcf5zATppufDHXamMGTHLiKPSQs_TuYLMm7Z_TOg4byWETvBRuEvQwwDLqMB8TJJP9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-Iqc_KcX',
    // L'Etranger
    224: 'y1FaLzbq3HpqYPdTNMrUxwC1oLGLRXGhODaRe3OMGlo5ReJbNmmK_zWs7ejFS2zMFeslQwECfaoD8XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pcA4DRQE',
    // Your Eternal Reward
    225: 'y1FTPifq03VhWvdpL8rUxDr3oPCKGTqlMGOWeSfbT18xH7oNMTuKqjH05eiTFzGYQuEqRAsFdKUC-2JPPMyMIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnaOgq7-A',
    // Black Box
    228: 'y1FUJiP71nZifdpgOdnBxUv-p-bbGS3ybmfGLieKHQ1qS7ZfYDrf_zr3tO3AETDAR7opRgBQf6MM7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxkF2y2dI',
    // Sydney Sleeper
    230: 'y1FFMyb22G1SdulpPdvD0jr3oPCKGTqnPzSVfHDbRAhtH-VWNGraqzT34OTHR2ycEukpEglWf6dW9mxBNcjaIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnhjWbPfg',
    // Bushwacka
    232: 'y1FVOC374n9jbONpB8fH0gL-7-HVHSOiazTGfCOAGVw9H7tcZDzbq2HwtO2QS23OEO4vRwEFdaAG9GRXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPXjFEFX1g',
    // Gloves of Running Urgently
    239: 'y1FUJTrx03NSYuljLs7V_xDppueDH23IZDbWKCSXRQw_HOFWMGqM92an5OqVRTrIRet6QV0FK6cD-jcdaJ2IaRFrhYdYriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANEOUZs72IxPtJDztzJEeY08CFsjA7g8MAbdBbuwlmCbWuDmO7MJ4sdSXl4ZQk68mHB5Bk17uq3ebVxGtngu9fOT_Mzlz4G7UQB5x27ihdVM',
    // Frying Pan
    264: 'yWJaFTL500thZPdrPYWelwf69LDbSXegOzPCeHPfT1w7GOYLMD6L_jGn5LiXQDrKQ716RA8BY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Isyo1DhJLzqQpGJdtpSFpIE-l5Y2uIU_rvwn-bWuG7O7NbscZXBl8cTEe6ynUoDhwovK3HKlMXEipImF4',
    // Iron Curtain
    298: 'y1FfOC324nd4d_FtMcX5zATppufDSib0bGHGeSOBRQ9sG-BaMTvQrDem7O2cQj_AEOgkFQ0MKaMM9TJJNdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-ByOfbNf',
    // Amputator
    304: 'y1FXJzLtyXV5avdTNMrUxwC1o7XbGiGhPWGVdiLaHVoxHrMKNGqPrzGm7bnAQDvKSespSgEBf6oA9XoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pdYkshlS',
    // Crusader's Crossbow
    305: 'y1FVODfr3HBod_ZTO9nJ0xb5rvWyEHXlbzKKLSWATA07SbNXMm-M-jGntO6VEzjKFeguEltWKfQM9WYbOpvcbhM1gplLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CCV8OFIYiNCvWAefkx33MWrGyOOcL7MZTX1gbSUu_knApXR0u76jfbAtIty8noaPHrpnk0JWxGAssumDu',
    // Ullapool Caber
    307: 'y1FVKyD9z0thZPdrPYWVklf58-SIGHf0bGaQLHDcSwZsTOEPN2zR_TGi4umTFjHBEOwtF11XY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKrXZe610J6ho8cSL6FEASsAPW6Isyo1DhJLzqQpGJdtpSFpIE-l5Y2uIU_rvwn-bWuG7O7NbscZXBl8cTEe6ynUoDhwovK3HKlMXrEMaM0Q',
    // Loch-n-Load
    308: 'y1FaJSHw03hiZOFTNMrUxwC1-LLUGiSiODaRK3OORVxuT7EMYD2L-zal4--dSzCYR-B-QgsGL6cAp3oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pb_-E2Ok',
    // Warrior's Spirit
    310: 'y1FULyPq4ndhZPJTNMrUxwC1-LSPHiGhbWHAfXmJSwxqTrNaPW3e_jKs5OWQRm6dRb0rFwgDe6AH-noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pfn_Jzzl',
    // Brass Beast
    312: 'y1FRKzb01HpqWuJ5NvTKwRf8pKzeHS3zMWaTd3mBHltqHrEKMD2K_zWjtLiRFDDOFL0pRwgGdfcH82wcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzF9HrTrgg',
    // Candy Cane
    317: 'y1FVKyz8xEtuZOtpB8fH0gL-77XfGCTxPzKUdiSNHgptG-VZN2GLqDunse3BSj3KSL5-EgANeKsApjFXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPUzknPqEw',
    // Boston Basher
    325: 'y1FUJTHs0npSZ-R_MM7U_wn6s-WIUieuPjTALXXfRAo9ROFeMD6NrGX3trnCFmrAROolQFpVe6IFpjBPNcCXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZrU_taL7Q',
    // Back Scratcher
    326: 'y1FUKyHz4mdud-R4O8PD0jr3oPCKGTr1PG_HK3eITFo_S7BZNTnRqmKhtrudEDyfEut4RQAEffEApmMYaJjfIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PncpwZTrU',
    // Claidheamh Mòr
    327: 'y1FVJiPx2XxoZOhjMMbJ0jr3oPCKGTqkPzaVenCLGgwwSeFcNGHa-TrztOrBSznIQe8uQ10CeKJQoTYYPJqLIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnDBPvApI',
    // Jag
    329: 'y1FcKyXH0XV_YuAiPsqQmFyv8OTaGi32MGDALSPdSg04HuFXZjvb_jKntO-SSznBSOwrQhdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPYk5dzEB',
    // Fists of Steel
    331: 'y1FQIzHszktiY9p_LM7DzDr3oPCKGTrxP2OQenaMRAw6SbcLZG2K-WWl4u-dSzrLSLwtElhSffQNo21BO52JIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75Pn7lhw264',
    // Sharpened Volcano Fragment
    348: 'y1FEIyTs4nJkd-BTOdPD_wn6s-WIUnakamXBLnGKRQs-GbdYPGzZ_2agsOmRR27PSO8pQApSK6FX9TJNOsiXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZrcEn6blw',
    // Sun-on-a-Stick
    349: 'y1FEIyTs4nJkd-BTNcrFxTr3oPCKGTr0ajWRenbcGQ86SOFZZmyM9zOg7euUQDDJSeElQgEFeqZVoWJANJ_aIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnoOs2NXs',
    // Detonator
    351: 'y1FSLzb303V5avdTNMrUxwC1oLWPHSXzMWKTe3eKSlppSLZaMWDZ-Dui5byRQDvASLp6FQoEdPBS8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pY-wDnKg',
    // Fan O'War
    355: 'y1FFIi3_yHpScuR-PsrI_wn6s-WIUiOjbmWSdnLfTV87S7sLMGHR-mCi5uuXRDrOSeAvQggMeaBVoDFLaJ2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZogbW96CQ',
    // Conniver's Kunai
    356: 'y1FFIi3_yHpSbvBiOcL5zATppufDGCL2OWWdfXbdGQZtRLVfMj3R-DPzs7nFS2rLSLwoFQFRffYHpjdJbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-JJBUrxF',
    // Half-Zatoichi
    357: 'y1FFIi3_yHpSbuR4OcXH_wn6s-WIUiH2OmbAfnSKSAk6TeIKMmjYrzKlsLvBF27LQLp9FggGfKUE-2RJacGXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZoBIDyKdA',
    // Shahanshah
    401: 'y1FFKSv11GBsd9pgOdnBxUuuo7fURXH2bGaRKieOTl87H7tYND2Mqzqk5rvBQjHJQbssEAhQf6sC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxjkRjEtk',
    // Bazaar Bargain
    402: 'y1FUKzj53GZSdutlKM7U_wn6s-WIUiXzbTTCf3COSwxpTrUNMm2P-GWs5ruQQTnNFLp-RlhQKasM82Eaa52Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZoWX6sp-A',
    // Persian Persuader
    404: 'y1FSLy_34md4afFtNvTV1wrppd2BHWbwbXmSKnCBTlwwHrcKZGDRrDDz4OuSQ23PQOgqQQ1XfPYA-mVLOMmNPhc8ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcvGkwZLrUvJz7USvrjwCqcDOO1OeMA4sJYVlgZTk20nyYpW04uuf_fbAVH4X918_eT-5mujou4LKSB4E8',
    // Splendid Screen
    406: 'y1FGLzDr1HVjWvZkMc7KxDr3oPCKGTrxOzGQLHPbGVhsG-JaYD7e-mLx4-idF2vISLsuQQsFLKRQ82JBOc3cIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75Pn-xIydWk',
    // Quick-Fix
    411: 'y1FGOC3s0ktgYOFlP97I_wn6s-WIUnf1a2SceXTYRAg-SrVXNjyP_2L0s-6TQ2vLELx4SlgGdKYA-mFPb8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZoY5Iy_Qw',
    // Overdose
    412: 'y1FGOC3s0kt-fPdlNszDxxD1nu6MDnPyJmfBeXWAGgsxSOVYNG3e_jHws-_HFGnLQu0pFwgHK_AN-2RJb5qIahAjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkIIOiCzrnA',
    // Solemn Vow
    413: 'y1FeIzLo0nd_ZPFpK_TE1Rbvnu6MDnPyJmHFeXfdGVg7RLUMN2zQ-mGjsO7FET-fR-8oEQ1VKKJR-2VJbsjbNhYjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkII6WPI6Zg',
    // Liberty Launcher
    414: 'y1FaIyD9z2B0WultLcXFyADpnu6MDnPyJmDAdnKATFhqSOZXNznf9zah4LiVFzHMRL0pRQoMevFQ9WwfbpqIOxUjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkIKfYLQCrw',
    // Reserve Shooter
    415: 'y1FELzH9z2JoWvZkN8TSxRfEreOfG3G5P27FfiPaSw8-HrNbMDmL9zX04OjCSzCaFLwlS10GdKcC9mxNOsqNawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umfY0LFnH',
    // Market Gardener
    416: 'y1FbKzDz2GBSYuR-PM7IxRfEreOfG3G5PmSVLXWNSQxqG-BbZm2MqzT05unFED3LR-goRAEAfvdW92IfacDbPQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umYO7shNO',
    // Tomislav
    424: 'y1FCJS_xznhsc9pgOdnBxUuipeDeGCz0bmOXdnHbSgpqS7ENYGve_DPxse3GFj3BQb4kRl8GfKMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxfiN8EjU',
    // Family Business
    425: 'y1FEPzHr1HVjWvdlN9_5zATppufDTy3xaWKXfCXdHVhrTrIPYDvb-mDz4biVQTvKRL0sQ1sCfaNQpjVKONfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-IodopgY',
    // Eviction Notice
    426: 'y1FTPCv7yX1ia9piN9_PwwDEreOfG3G5PjXAeXXdHgY-G7JeMWGM_TGm5O-RQmycQbouRFwNKKsFoDcaaZ2BbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umbMCR7kg',
    // Cow Mangler 5000
    441: 'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75Pn_ONQY8w',
    // Righteous Bison
    442: 'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CCV8OFIYiNCvWAefkx33MWrGyOOcL7MZTX1gbSUu_knApXR0u76jfbAtIty8noaPHrpnk0JWxGGijvpxj',
    // Mantreads
    444: 'xW9YPjD93HB-WultKszDjlypp7GJGnD2bmfBfSONTQdsGbcKYTzcqGD25bmVE2vMQuApEABXefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ilQSQnlUw',
    // Disciplinary Action
    447: 'y1FEIybx03NSZvdjKPTKwRf8pKzdT3DxbWaVeXeARAZuGbYNNDqM-DTw5umTRj_AQeksSw8DffdW8jYfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzF9kVqkO8',
    // Soda Popper
    448: 'y1FFJSb54mRidfVpKvTKwRf8pKzVRCCmP2GSfHGAS1o7TeYNNmyKrWbz5-WXETCbQ-orFVwFKKIE9mxBI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFxRZIv7U',
    // Winger
    449: 'y1FBIyz_2GZSdex_LMTK_wn6s-WIUnGmaTXCdnncHwkxGbBXPWrcqDGit7-QQGzOQu8pSw9QLKVV9GZPbsuXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZqJAk9ihA',
    // Atomizer
    450: 'y1FUJSzz4nZscdpgOdnBxUuj8ubaGXClMGLHKiSOGl09GLFYNmzc92Wg4unGFm7JQO14FV9QLvcF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBx5_Vg-Nw',
    // Three-Rune Blade
    452: 'y1FFKS3tyUt-cup-PPTKwRf8pKzVSnKgam-SLCDcGgxqG-APMTmPr2ass77BET3OEukrQl0Af6AF-zEYI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFo2wpSpk',
    // Postal Pummeler
    457: 'y1FbKyv033t1WultKszDjgP4-LSMTXahPGTCfiKKTlg6G7INYWiP-Wen5OicEDifF7ovF18FefEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7imHt1MBBw',
    // Enforcer
    460: 'y1FFJDf64npiduBTNMrUxwC1-bGMGiyiO2LHdiCBTw49RLcMMW7brGGh5LyTEzjIR-p6QwhSePYCoXoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pZqGGPyb',
    // Big Earner
    461: 'y1FFPSvs3nxvaeRoPfTKwRf8pKzfTXemazaSeXbaTFwwH7BYYzzb-mXw7emSEz6cE7x6QV0HKfZV8jdPI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzF2PxWFhg',
    // Maul
    466: 'y1FELCPH1XVgaOB-B8fH0gL-77TeTnL0OG6XLHDfTAtpRLtfPG6M9mGmsO2cRDmbQ7woFwANf_QApmxXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVyCEdKrg',
    // Conscientious Objector
    474: 'y1FGIyHz2GBSaeR-P86ImFyu97OOGXKuPDOWfnWOT1xsRLENYT6P-jqgs7jHRj-fFbx4RlwGfrxErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e54tv2_u2',
    // Nessie's Nine Iron
    482: 'y1FRJS7-3nh4Z9pgOdnBxUuu8LXdRCLzbGOdfCWJRQs9SeILMmCK-zX07ejGQT7PQukpS18Df6dR7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxJzDyq5k',
    // Original
    513: 'y1FULzbHz3tubuB4NMrTzgbzpPCyEHXlbzKKeCLfTA4wSLReNGze9zaj5riWFz_MQ-l5RgBVKaIG8G0dOJrYbRI1gJlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CCV8OFIYiNCvWAefkx33MWrGyOOcL7MZTX1gbSUu_knApXR0u76jfbAtIty8noaPHrpnk0JWxGFfXzCe1',
    // Diamondback
    525: 'y1FSLzrHz3F7aul6Pdn5zATppufDTy32aW6SKnLdS1o7S7tXPWja9zT37LjHRz_BR7soFwtReKpS8DVLOdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-CKcOfbb',
    // Machina
    526: 'y1FSLzrHznpkdeB-KsLAzADEreOfG3G5bTSVf3PbHlxuSrtaN2ra-jL2sbvAFD6aFb55QA4EK_ZWpzBLaMqAawx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umV-LcGha',
    // Widowmaker
    527: 'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFbx-E1-4',
    // Short Circuit
    528: 'y1FSLzrH3GZgWultKszDjlSroOeLGHKuOGGReCDbRVw4G7JWYG-N-jWj5b-cFz7PRekkFwkAe_casjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ikNTXbd_w',
    // Unarmed Combat
    572: 'y1FDJCPq0HFpWuZjNcnH1Dr3oPCKGTqgPmCQe3SLRFxrH7FeYW2I_Tqn4eucET2YRO8tF19QevQDoDVAPMmIIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnMbGeTr8',
    // Wanga Prick
    574: 'y1FAJS380ntSdexiB8fH0gL-77PYTSX2bG_HKnmJSgs5RLcKZ2Hf-zCj5bzBETrLF7wkFQxQevYF8GZXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVZ9yhlEg',
    // Apoco-Fists
    587: 'y1FFOHHHzWFjZu1TNMrUxwC1pLqLTSL1OGfCf3fYGQdsHLEPNj2N9jPztruTSzHOFex6RAkEeqcE93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pVSoNj-P',
    // Pomson 6000
    588: 'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVK4PwXSQ',
    // Eureka Effect
    589: 'y1FSOCXHymZoa-ZkNcTS0gr1nu6MDnPyJmDFLCPcSww9SLRXMDnfr2Ws4rnBQzybSbwuEQkGevEE9zVMOc3YbRIjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkIIm1q97ww',
    // Third Degree
    593: 'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umeNw5uez',
    // Phlogistinator
    594: 'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEYAQMcZTY43xJFHt6H1qQhCeI0CCV8OFIYiNCvWAefkx33MWrGyOOcL7MZTX1gbSUu_knApXR0u76jfbAtIty8noaPHrpnk0JWxGBQRhZZm',
    // Manmelter
    595: 'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8Zpzg5Nmyg',
    // Scottish Handshake
    609: 'y1FFKS3s0XVjYdp_MMrUxDr3oPCKGTryPDOTeieNSV09HrpeMDzd_juh4OyURW2bQuEoQw0MefNR8W1IbMDYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnEfue1z8',
    // Sharp Dresser
    638: 'y1FXKTDH1XtibudgOc_D_wn6s-WIUnXxbmGReHeLHgY6SbJdZGnf_Drws76cQz-cROwrEAwEf_FSpjcdO8uXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZpvXRonPg',
    // Wrap Assassin
    648: 'y1FOJzHH2n1rcfJ-Odv5zATppufDTiakbWeULSWPSlhsT7ZYNTzf9jb37L6cETjPEuElQgkCeKMG9jBLbtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-OoSaEeN',
    // Spy-cicle
    649: 'y1FOJzHH3nthYdp_MMTTzAH-s92BHWbwbXnGKnaJHgk-ROVaMWCL9jL0s--WEDDKQO9-RgAHf_RV92dINc2NPRY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIx0QdScQPTZQxxZ5KhJngvgxQbrcvGkwZLrUvJz7USvrjwCqcDOO1OeMA4sJYVlgZTk20nyYpW04uuf_fbAVH4X918_eT-5mujou4Xl5HQsg',
    // Holiday Punch
    656: 'y1FOJzHH2nhic-B_B8fH0gL-77HeSHKvbTXFKXeBGAwxS7cMNDne-Dqi4unCEz2cQugvFg4DffAF-m1XfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPUjxu7GAQ',
    // Black Rose
    727: 'y1FXPCPHz3t-YO5iMc3D_xPEreOfG3G5bW6TfnndSAk_H7oKPGDdqjf2seqdQjzPFLx4QQkDfKANoTUfOp2OOgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umR3Tip1v',
    // Beggar's Bazooka
    730: 'y1FSPy_ozmBod9poPd3PwwDEreOfG3G5aWHFeyOMGQZpSeJXMGCMqGX0t7icRGvJSOEtQwpSdPAB8WNIP8vbbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umdbfRHGu',
    // Lollichop
    739: 'y1FaJS701HdlavVTNMrUxwC187CITXenPmGVLHaPRVo9T-ZcNjuMqjDxsOTFFD6YSboqFwoEdfYC93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pQp9qJhg',
    // Scorch Shot
    740: 'y1FFKS3q3nxSdu1jLPTKwRf8pKzbHnWgbjSRdnaNRQpqTrNXPDvb-DP25b-URT3NQL0qRAwEf6QApmIfI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFDqrUiQI',
    // Rainblower
    741: 'y1FEKyv233hicuB-B8fH0gL-77bYHXGhO2aWf3CMTA06H-VePW6Krzus5buVSzvIELwqEV0BeaFS9TdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPV707Tl_g',
    // Cleaner's Carbine
    751: 'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7inM1lajDw',
    // Hitman's Heatmaker
    752: 'y1FGOC3Hz31raeBTNMrUxwC1o7LaRXHyOWfGLSfbRVxrG7pZNGzf-zumtL7HFD_ISb4pSwkMeKtV9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pfNzAvT9',
    // Baby Face's Blaster
    772: 'y1FGLzLHzndscfFpKszTzjr3oPCKGTqmMGTHfiXbGgc-G7ULNmjbq2as7OWUQz7BSLl4EF8GKfMN9TBPOMiJIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnaZFmhlQ',
    // Pretty Boy's Pocket Pistol
    773: 'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPVLzZoIpA',
    // Escape Plan
    775: 'y1FGIyHz3GxoWultKszDjlSs8ObYTC2mMTKWeiXbTgprGOEPMmzb_GCn4OmRFDHIQLx-S1gEKfEasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejGb6dhMbJ09sqJ1lotSNMZX4479I1HqZvNtwxRbI1zSApPFe0sZW6HVvDgwHaZX-C2PegNt5MEUF5LTEm7k3MqDhoovfiNPhMA7ilzbWBdKA',
    // Huo-Long Heater
    811: 'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e51wE5y3Q',
    832: 'y1FVKyzs0npSaeR-P86IwVH_pOTaRSSvOmaTenmBTF85TbtYYz3frzX0tOSXFD3KF-oqSw4Hf7xErDNfZJTePn111IoL5TfgwgJ0ExF5Td0XLV_1nCdGd7Qoz3AtPJtfmTr0JZTP3AI1aSkjW7XnSLvKb5f00G99CRdjG6AMPdbCtXy_p8mydbfEcq5iJ7Ju8MuG22kVXcQdTZgB2Z5UvqH-uh9EbsZuTw0YRbt-Ym-DXf7ky3-ZXeewNuVbt5VXUAgcTEm1nCV6XEh86a2NdE0e51wE5y3Q',
    // Flying Guillotine
    812: 'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPUTTXP_dA',
    833: 'y1FFLh370XFsc-B-B8fH0gL-77GLRXKibmHFfyCBH1w4SbcIYGvQ9zPx7bmcR2vMRet9EgsBfapXo2JXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud3Jq5h-taU3lkcTs0jWY87yoxDhIzzqQh8Z4kvHFtSQu19MW3TVP7hwXefXeuzPuIN58hUBQtOTUjsnXJ9B0546arYPwwU5GBmrPUTTXP_dA',
    // Neon Annihilator
    813: 'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFkqomn9Q',
    834: 'y1FFLh322HtjduxrNvTKwRf8pKyISnKvO2WSenffTg49HrsKYzyM9jussOWUEzDPR70rEAsHK6pX-mZAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFkqomn9Q',
    // AWPer Hand
    851: 'y1FVOSX34nV6ddpgOdnBxUv5-LPUGHWkMWWTKSWNSQ89TeBWY2GL-Gfws-zFRj3KRr15EA9VKPAC7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxEWVeYJA',
    // Freedom Staff
    880: 'y1FCPR393HNhYNpgOdnBxUv_pbGJTiKiMGeTf3GLGQ44RbYPNWve-Dr2sbidRzHBQ7woRAkFfPZW7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBxumNLUTw',
    // Bat Outta Hell
    939: 'y1FFITf00XZscdpgOdnBxUv4oLfYHnL0MWWReXjbSgw7GeVdMmrbrTOltOSVRD7JQ-96SgEMfvFV7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBKuoz1vkNFOIs-SAoeRroqZW7XUvm2xS-bX7a2O-Fd4MQCAw9PHEvsyXR9C0ot9rmHPexBMvvm',
    // Loose Cannon
    996: 'y1FSLy_34ndsa-tjNvTKwRf8pKyPHi3yam_GeiXaHl9qHrJYZmHYrDGj4-SQS27IEuwkEg8AK_QNoTYdI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFmJmvrfc',
    // Rescue Ranger
    997: 'y1FCLy794mdlavFrLcX5zATppufDTifxajaRfnmATwg8H7VfN2nf_TKj7O2XFzzLErl6QwsCL_cG8TdJPdfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-KUffWrz',
    // Vaccinator
    998: 'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umVZwoIXY',
    // Ham Shank
    1013: 'y1FeKy_H0XV_YuAiYJKfwlOv9bOMGiDxPTKReXmAGls7TeVZMmmK_DWisOrHQDCdSO8rShdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59ezNaHTbrtuO69m8_qAxVMTXMQjTJwszqBKuoz1vkMQP9s5T1xMRu98bG6CXPjmwHqaV-fgbbUO4pBWUV8STR68yHUuDh199rmHPfptlhnK',
    // Fortified Compound
    1092: 'y1FUJTXHyXxkYONTNMrUxwC18-PVTHKlOWaSeXSPRV0xSLsLZmGN9jantOqTFjjPSb5-Fg9SKaQH93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pSwUaXjd',
    // Classic
    1098: 'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umQTLeqEM',
    // Tide Turner
    1099: 'y1FBIif90Ut-bexpNM_5zATppufDTyylamaTLXbaGlg-S7FZNGDaqDCj4rmXSjnBR70rElgDeqBW92cfOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-DdxU-IK',
    // Bread Bite
    1100: 'y1FUOCf52Xlia_Z4Pdn5xwn0t-eeI3j2ejDBYXDbGAg9H-JWMW3bqzL34ezGETHBFL19F10BKaYHozYaOsDcbRtu3dEVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkCXc4aW44twpBIupLNvB9Gaps4JEwdA7wROTjDA6z5wHqbCufgP-YP58hXVFEbS0y5mX1_XRt97_6IbAtGuHl38_GT-szkmsuvERedU7PA4g',
    // Back Scatter
    1103: 'y1FFKSPsyXF_Yfd5NfTKwRf8pKzYSyOiOWOcKXKIH1ttTrpdYWGN_Teh5L6SRW3BFe0lQg0MKfQCpGFLI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJLNo-cCUxF8dQcAQYZoszp5VvqHguh9GVIQ8CVkZX-p6Zj2FBvngxXyRWeC6PuAK4cNZUwtIHki6ynJ9CUEuufiKa1hB5Co4svzFQ3jy-aE',
    // Air Strike
    1104: 'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-537cqB0kUBRs4SX5EBzI1Duo33hB9CeY0CF18OFrxgZm2CAP21w3meXOq1POkI5MJUVVAeGB3pnHMqCU8v4P6Ia15B5X9yprzS8ZqlfadugQ',
    // Necro Smasher
    1123: 'y1FVKzD21GJsadphOcfKxRHEreOfG3G5OGWWf3HbHwdtG7dfZGzf_zSssO6RRjDPRO4rSgwHK6UBo2cYOZ3baQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umTtoKE-c',
    // Quickiebomb Launcher
    1150: 'y1FdIyz_0HVmYPdTK9_Pww7inu6MDnPyJmCVLHWKRAxrRbpWNzvYqjWgseTCQzvBQLwrSwhRe6RV8GxObsvYPEMjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqXxVkUStIPV5IwypN5vIz3uh5GVJo8CVsjHbg8MjyfV_3kl3rKXuS0PegO5slRVloeSEa5ySYvCE547v_fYgoRsS0np6PG-9PwkIIl2pwhXA',
    // Iron Bomber
    1151: 'y1FHPyP833VhadpgOdnBxUv997bYRHCkamCQLHWBTl1uGLRfNzuN-2ah4-nGSmuYF7p6QwkFdaMF7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbbpoMqR07MyI2VcecMYOW5wtzqBUuoz3hAFCeY84VQ1IQr16N2mGUvvuxH2QX-KxO-MA4ZMCA14dG0m7nXx8Xkh66azYPlle8CBx9b4fDTk',
    // Panic Attack
    1153: 'y1FCOCf23nxqcOtTNMrUxwC19OaOGS2hOWaXfHLdSQc_SbBYYTrYqDX0t-iUET-fR-5-FQ9Re6YCpnoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pXrf_kIk',
    // Dragon's Fury
    1178: 'y1FQJiP12HZsaelTNMrUxwC19uaMTCyhPTaRLnSKTQ9rSLMKNWDdqGemsLjHRDCfFLokQg8HfKUF9HoJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrh1O6di7NaO2FgTQ_4bTJg_2Jp5qZ_gvjJPapo6HhBPReoqYTuBU__lynmbVuKzPOUL7MUCBQ0dTR67nXJzCBgou_iMa1kUrj54pThvjhGr',
    // Hot Hand
    1181: '31FFJiPozX1jYtprNMTQxTr3oPCKGTr0ODbFdySASl9rG7JcMGzZq2eituTFRGmYQOouRQ1WfacC9TZJPJ-KIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo79eI0VMBXMgTUJwy9JhUvp_hvjJRapo4JFIdA74re2qFV63jkX6fWOG7OOIB5MBTU1sTTh3vz3N8Xk8v7vHeOwwTsSsnpvaM75PnVlSzHbE',
    // Shooting Star
    30665: 'y1FfJDT5zn1ia9p_NsLWxRfpqOSBGUv7aSXDKm_YH1s5SuELZmuMrzrzsL_CFGvLF-p5Sg4NdaQApmBJPJ_caho80NEC5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdX9MTWJgt2JZJtZ_-hApRbokuHmEOEKsrCjXQFq6y3X2cXbe2beEO48NZUFoSS06-n3ZyCxt7vP7eOwtGtnYho6PBrpixmoHxDx5w6AhlCnM',
    // C.A.P.P.E.R
    30666: 'y1FfJDT5zn1ia9p8MdjSzwnEreOfG3G5OTLFfieAGgcwSrddZ22I_2Ggt7vFFj-aQrsrFQ4Ce6sN92VBNMrabgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNWV2FAXXNIVUZM_x6BBqZvzqAh8eYkvHmEQEKspMHeCUPqzxyyYWeWwNuYK7cBRVF0YQ0vvySB8CBgv7v_RbVxB439z8_bGsY3umeDq3Fn-',
    // Batsaber
    30667: 'y1FfJDT5zn1ia9puOd_5zATppufDHyL0amWReniJSFg_HrYINT7Q_jH34L-QFDufRbssElgCf6MG-zAaOtfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7F18MOCxEUbQM8dUqI52ZpHqJvNqQxRbrcxGkwbFPd9YWrVUKvnxHiaV-SxN-AI5sVSXl1IGBu6nCV9CU8h76jYOQwVsSpy7OLM-CRiV0it'
};

const strangifierImages: { [target: number]: string } = {
    // Reference: https://wiki.teamfortress.com/wiki/Template:Strangifiers_table & tf2 schema
    // Pomson 6000 Strangifier (5661)
    588: 'y1FSOCXHzXtgdupiB8fH0gL-7-fUGCymOWLCdiSOHQowTbFdPGver2bxse6QETzLELt_Sw0DeaEA9TJXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq71lTT6Gg',
    // Pretty Boy's Pocket Pistol Strangifier (5721)
    773: 'y1FGLzLHzX1-cepgB8fH0gL-77vfHy30OTPCLnmIHws_HLoPZzra9zek57nHFjmaR-p5RAhRdPcA8WNXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq5kc-XNmA',
    // Phlogistinator Strangifier (5722)
    594: 'y1FSOCXHzXxhauJlK9_PzgTvrvCyEHXlbzKKKieMTgk7SOEMN26N-jv35biWFmrNQLsqEglRfasCoG1OOpuAOBU10plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pY2xSYgx',
    // Cleaner's Carbine Strangifier (5723)
    751: 'y1FGOC3HznlqWultKszDjgb987WMRHDyOWeSe3aJTg5sSrMPNWja-DX24unCF2maSeEvFw0EK_YasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR5df1B87w',
    // Private Eye Strangifier (5724)
    388: '235PFTLq1GJsceBTPdLD_wn6s-WIUiXzPTWWf3OJSws-GOUMPWHYrWXx4OyXFjCaFel5EQEAeatW-2NMaZqXf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFo4dWLn1Q',
    // Big Chief Strangifier (5725)
    309: 'wGtXPDvH331qWuZkMc7A_wn6s-WIUiamMTHFfnCATA5uHOBbZ2_c_mak5-jAR27OFO14RgkBK6sA-jdJaZ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFqXGUWhig',
    // Air Strike Strangifier (5753)
    1104: 'y1FXPi314nhscOtvMM7U_wn6s-WIUiz2PzLCd3eKTgk5HLcLPGHQrDLz5OjGRjubRbx-EQsNevEDoTYfPs2Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFryVcUbRQ',
    // Classic Strangifier (5754)
    1098: 'y1FCLCHHznpkdeB-KsLAzADEreOfG3G5PGeQdnaAGQ9tROFbPWHY_TemtLnBR27PROAtR1pXKacN8zBPP8zYbQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5-cVmfXp',
    // Manmelter Strangifier (5755)
    595: 'y1FSOCXH0HVjaOBgLM7U_wn6s-WIUnbxO2GQfCLaGAtrG7JYNm7Z_jb37OSQET7LRu16RF9QfqoN-2RNaJ-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFoNLjGUwg',
    // Vaccinator Strangifier (5756)
    998: 'y1FbLybx2mFjWuFpPs7I0wDEreOfG3G5OmXCdnSMSVtrTroIMjnZ-Dqs5uWTF27AQrokEg8MeaYD8WJJaMDdPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5w1n3f2Q',
    // Widowmaker Strangifier (5757)
    527: 'y1FSLzrHznxiceJ5NvTKwRf8pKzYGiLzMG-cLHmASQk_HLoNZjuLqGDw5--dSjqaQ-gqEQFRdPcE9jFAI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeO4nSV3sk',
    // Anger Strangifier (5758)
    518: 'y1FULzbH32Zka-5kN8TC_wn6s-WIUiyva27Be3XYSVw6ReZaMWCMqmfztuSTFDnIRr0tRggCLqEApzIaa5-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFohYLRXUQ',
    // Apparition's Aspect Strangifier (5759)
    571: 'z2ZZOTbH3Gd9YOZ4B8fH0gL-7-HeGXeiOG-Te3PaHwkwSLYPPDne_2f04--VSjDBR-95Fl8GK6VXozdXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq6EC8Dtxg',
    // Cow Mangler 5000 Strangifier (5783)
    441: 'y1FSOCXH3nt6aORiP8fD0jr3oPCKGTqhPDGdeHKIHg1uROZWPDqK-TvztujGQjnOEOh6Rg1QeaoH8jdBaZjYIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo7NGV1lgVSv4bW5M72ZZFhJLzqQpGJdhuTg5KE-h_Yz2AVf61wCueV-K6PuIOsMdVBQ8bH0y-z3R9XUt866jHKlMXjPy0Lr4',
    // Third Degree Strangifier (5784)
    593: 'y1FSOCXHyXxkd-FoPczUxQDEreOfG3G5PWeUenaKRQ49SeVWZ2yI_2Cs5OSdFGzMFekoQ19ReqNS9GZPOpvcPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e53GjJztD',
    // Righteous Bison Strangifier (5804)
    442: 'y1FSOCXHz31qbfFpN97VwgzoruyyEHXlbzKKfnOLHgw7G7oNZmDf-zei4-nCRD2YEO59Q1sBf6RQoDZLbMCJNkdphZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pS_Iw4mp',
    // ---
    // Bonk Boy
    451: 'ymFYIR313GdmWultKszDjgSv9rCJTyD1O2eXeHWKTwk5GbFXNWna9mast-SdRz_KE-glQwoEevYasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR4svlK1Ew',
    // Boston Boom-Bringer
    707: 'ymFZJyD3xUthZPdrPYXFwlD4-brVTXKnMG-ceiePSgg8T-EKZmjfrzak5OvGQG3LQbp-SlwAY-JapXIQYJ6IUFo92YcV-T3t0U1wGUcXapQbIEHtmSFVOLAimR4LdZZShyDzJoKA2AhjBw9rV7j5UbTCedDl0HZwUB5jH7ZDOdyY4XazptTuKbPEfKZgMZ5g-suCxV8RcM0dTJo7hc8V7s6kuVwSPYxsSgkeQrx4bGiJVfrglnidDLWzauIKscFWBVtPSR6j2yosDrnqyY0',
    // Sole Saviors
    30358: '22xZMnCojCBSZPdhN9n50w30pPGyEHXlbzKKfCeMTgowTLMNZmjd-TX3sezBFm6dELx4RAgAeqQD8G1BPMrdbhJo0plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pS4sWWFK',
    // Ticket Boy
    30376: '22xZMnCojCBScexvM87S_wf0uN2BHWbwbXmWeyOASw0wGOJdMGvb-2Wh5enAE2vBF-klQVxXdPZR9GxMPZyBOhppysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBxp1vheNc',
    // Fancy Dress Uniform
    446: 'zmpDFS75z3NoK7VvbciekAf5-bXeSnenbGOcLCLcGgtpRLVYMW3erzCi4LnGFz_JRe4yA1dTa_tZpWUmdcmEPww_3IIdomi_xntlT0t4PJMVJUmyx3NCDqR1lXFccZhSj32tcZW2zF5vaFhtUrjxB_yCNtWolCskS0M6SK1DN9TL-zqvvNWgNKDTQq9iOqR19sa421cASMRSDs5rm8lE6s-kv1wSPIpuHghFQOF_Zm7UUvy1lX_NXeDmP-db55RTBkdaFBhIUBdMEQ',
    // Lord Cockswain's Novelty Mutton Chops and Pipe
    440: 'zHxRFSr51GZSZ-BtKs_5yQb0r92BHWbwbXmWdnSKHwsxGbsPZzrY_2LztL_GRTiYSOEoRQkBdKFR8GEaP8HaOxQ_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBxoK33u5w',
    // All-Father
    647: '0GNFFSD93GZpWultKszDjgGj97fUTHWnOGOXeCXdHl1sGLdePTrb-mWts7ycRDvAQbopRV8AL6sasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR4SkHgL8Q',
    // Killer's Kit
    30339: '22xZMnCojCBSbuxgNM7U0zrwqPayEHXlbzKKe3DfTAYwT7RWMDvd-mGl5--dQD2dEL14QggFf_cCoDYcb8CBPUZu3ZlLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pR8THNYv',
    // Ground Control
    30338: '22xZMnCojCBSdupgPMLD0jr2oOiCDkv7aSXDKm-JH1xuHOFcYTnZr2ek4ruTEDCcRu55FwxVfPYN8jdNPsqPORs91YML5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFQO9HCAo',
    // Stockbroker's Scarf
    336: '2HdEJR3sz319cux-PfTSyQDEreOfG3G5am-VKiTdSl8_TOIPM2mMrWajtO6RFzzPF7kvFglVLPYC8DBOPc7dPwx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5xtR8z-a',
    // Sight for Sore Eyes
    387: '22FELx39xHF-WultKszDjlOrp7rZGCyvazXAKiKKTAZqSLsNYWuL-mf24LiXF27ORbwlR1pRe6UasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR5Est7Iig',
    // Cute Suit
    30367: '22xZMnCojCBSf-x8KM7U_xbuqPayEHXlbzKKKySBRQZpSLcLMWHc_TehtuWcFzqaRLx9RwBVe6MG-m1KaJiIbkE0h5lLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pfbOlLVG',
    // Sole Mate
    30355: '22xZMnCojCBSdupgPfTLwRH-nu6MDnPyJjWdeXiOS1swSLFWPGDQqGKntOyQSmyYEOt5QAkCeacB8GZNbM6PO0EjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7ilw2qtZLQ',
    // Horseless Headless Horsemann's Headtaker
    266: 'y1FeLyP8yXVmYPdTNMrUxwC1-LvaHiGvam7Ge3XfRQkwTrINZGGNqjL05rjFRWzIErx6EQoHK6ME83oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrtzJqBp-MC40FMcStMVXaIyyo1BvtCi6FgTPYpsSggYQOh5N2rUUvDmy3-bWba0OrNf5JRTVA0aTB2_zncqEQl3v3kBkZBA',
    // Bird-Man of Aberdeen
    776: 'zGtbJR3o3GZ_avFTNMrUxwC18rXVGCWuaTKcLnSPSQgxHrpcNmuKqDHwsOrBFDHBQ-ouFVgGKKQF93oJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrtzJqBp-MC40FMcStMVXaIyyo1BvtCi6FgTPYpsSggYQOh5N2rUUvDmy3-bWba0OrNf5JRTVA0aTB2_zncqEQl3v3HOBRPu',
    // Dark Age Defender
    30073: 'xW9fJh360nlvYPdTNMrUxwC19LaOSCGmOjSSfSKKGQ1qGbZXZGuK-TWiseyUETufSO0vQQEFe_QH8noJY56fZk9q1ehD-zjo2RYlS1Ahf8IXTxfqlyRdZ-5wjigfIpo90CT9Jordhl90MRs9W9euV7HCcYatkDl1HVo-S60eYIuD4Xi79c6iNanFMrtzJqBp-MC40FMcStMVXaIyyo1BvtCi6FgTPYpsSggYQOh5N2rUUvDmy3-bWba0OrNf5JRTVA0aTB2_zncqEQl3v_qHNRj4',
    // Bushi-Dou
    30348: '22xZMnCojCBSYeBhN_TVwQjus-OEI3XlZTjRPR7VHUxvGK0NZG3Q_jas4rnFEGyaEu59FwpWf6VV-2RKPsDaO0E40IIC_mfqlBEsUAYmdYNPfQjq9WxDbO1rmnlHY8IPziWfbpXUhUFka0N8A-WwV9OLb4yljisnXQw-QvcbC8KUtSXy_5_xfKbGbaFjafUzr4OO2lFPRsITUI5x2ItUupD1vjJEboY4CVcfLrUvJz7USvnkxn6eDOKzObUI5MYCVAwcQ061mnd8Wk8suq_YPw5D5H4goKDHrJyujou4OnEXFCo',
    // Juggernaut Jacket
    30363: '22xZMnCojCBSb_BrP87UzgTutd2HHXf8bSP7IyDLG1smG7tfYWnb-Tujt-jCE22cRb4pQAxRdfFSpjdIacHYbkc_hYFY8jXslQptEBFue8hBITCjmilDf-99nWcbKMxT9mzxK5THg1xnfh83DbmIH7zPb5-hky8yBEcwHs9TZYaVpiLk-IGgKrffefUzYPEh9siAil8RQM8PEY4q2Z5IvJvNvAhNbpo0GGEQEKspMHeBV_znxSyZX-XmPuAOt8IFUVAbQk6-nCF9Cht_6azaaVlAtiwkp6HDsY3umYWIGPD9',
    // Sangu Sleeves
    30366: '22xZMnCojCBSYeBhN_TVwQjus-OEI2f7bTLSKjLmEF96GuZANzra_Gaj7e6cSjHIF-x_Sg8MLqdRpjAaPMGBakM_h4QKqWe7xxAtTFg4fMIAeQK8m0sLYeB1hnNKcI0LxHPxSdzYiF98bkVvTOG6Ab2tJoGokDEgXhpxRv1NZeTcuSjs5pD5auHXbbhuMPwzq5XB3lsVEsgfUZMthIxSqZ_8vAh8bI0zHkwVEoYiNCvWAefnwHuYWLGzPudd5MBXBVpPTEa8k3V4CBwv7auPa1hDsyom9PCQ-s7h0JWxGGUifx33',
    // Stylish DeGroot
    30340: '22xZMnCojCBSdvF1NMLVyDr_pOWfE3vjVzvFPSbcUlptRbYINGHZ-2bw4-6XEGvBE-8pFQ4Mf_BXoWYdO8uNPxY4hdZZqTb2h0p6WB8ldZR5aF_mmjpBaehjwSwVdPQamCnwOJLagEk7NRFrNfHnW7zca4KlhnZ5ChsIVqEXZJWSsCX6qdexM6OLKfw3cqhq-JiO1FkcXI4PSo8_xZhDhJn3tQhRYosCF18OFrxgZWqEVP-1wn-eCuKzOLMKsMdZVlEbSUjonXEpWUh86_qNagsSsislo7zS8ZqQWzLM0A',
    // Toowoomba Tunic
    30373: '22xZMnCojCBScepjL8TJzQf6nvaYEn30VzvFPSbcUghrT-VfPWGP_jKjsOidSjmfQe0tFwkEfaUMoTFLbsuINhs70IMM_TL2h0p6WB8ldZR5aF_mmjpBaehjwSwVdPQamCnwOJLagEk7NRFrNfHnW7zca4KlhnZ5ChsIVqEXZJWSsCX6qdexM6OLKfw3cqhq-JiO1FkcXI4PSo8_xZhDhJn3tQhRYosCF18OFrxgZWqEVP-1wn-eCuKzOLMKsMdZVlEbSUjonXEpWUh86_qNagsSsislo7zS8Zr3_CJiKg',
    // Sandvich Safe
    643: '0GNFFSr93GJ0WvZtNs_QyQbzsuOLGUv7aSXDKm-OGgYwSOEMYT7a-jP0triSRjycRO0kQwEFdKEG9jZJbsmPNxY8gIYI5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFQaSB4gs',
    // Toss-Proof Towel
    757: 'wGtXPDvH33t1bOtrLMTRxQnEreOfG3G5OG_BKnXaRQcwS-YNNmDa-2L37O2WQjmfErspFglRdfZSp2JOOpuKPgx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5zuA4tei',
    // Bullet Buzz
    30344: '22xZMnCojCBSbeBtLtL5whDhu-GYCEv7aSXDKm_bHQhsT-BbYWqLr2Ks4OWdS2yYRuEpF1wMeaUDoDFOa8zYbUFp0dYI5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFpGvf-1A',
    // Combat Slacks
    30372: '22xZMnCojCBScuR-B9vHzhHonu6MDnPyJjGSfnbdHQlsTbUMZGHf9zGh5O_ARmzAF-5-RVsAe6oB-m1AaciOO0cjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7ikRknV1HQ',
    // Eliminator's Safeguard
    30369: '22xZMnCojCBScuR-B8PDzAj-td2BHWbwbXmVLXOMRQoxRbNdN23dqzOt4u2QS27IRut_ElwFL6oAo2YcPsGKNhQ7ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBxcfr_jqQ',
    // Gone Commando
    30343: '22xZMnCojCBSbeBtLtL5wwT2rvKMEmDkVzvFPSbcUgtsSLUKZzmK9jb2sLjFQj-cFe19QwoGdKBW9WwcPJ-AaUE90NJaqjD2h0p6WB8ldZR5aF_mmjpBaehjwSwVdPQamCnwOJLagEk7NRFrNfHnW7zca4KlhnZ5ChsIVqEXZJWSsCX6qdexM6OLKfw3cqhq-JiO1FkcXI4PSo8_xZhDhJn3tQhRYosCF18OFrxgZWqEVP-1wn-eCuKzOLMKsMdZVlEbSUjonXEpWUh86_qNagsSsislo7zS8ZqNKY7i3A',
    // Heavy Lifter
    30342: '22xZMnCojCBSbeBtLtL5xxD1suqCC0v7aSXDKm-BH1xqHucLPGGL_DKjsLnBRDnPELwuFQEBKaAB9GUYOcqPbho0gtMP5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFM1L5zgk',
    // Leftover Trap
    30345: '22xZMnCojCBSaeBqLMTQxRfEtfCMDEv7aSXDKm-KSwg4G7dfMW3drGf057_BQm2aQr0lRVwCLKMMpzAbPs-LaUc-hYVY5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFTkJSPwI',
    // Rat Stompers
    30354: '22xZMnCojCBSd-R4B9jSzwjrpPCeI3j2ejDBYXHbTV9uG7pePGnQ_mes5ejHEGnKQL0vQwsEdKQBp2VMbMyPPxY5htUVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkBW9MdUJo79JhDtZvgsg58Z4kvHFtSQep7ZW_TVfjhl3-ZWbGxaucA5MlRVF5PTErvzXUuDEp96P-LaFhD4WBmrPV9mZZfCg',
    // Sammy Cap
    30374: '22xZMnCojCBSduRhNdL5wwTrnu6MDnPyJmfAKyXaHgZsSroPZzzb_zuk4LmVQ2ycSewtS1oFLqVVpGUYO86LPREjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7imCnlZQYg',
    // Trash Man
    30346: '22xZMnCojCBScfdtK8P5zQT1nu6MDnPyJjKdLHHaTwxtS-UIMmqP9zCt57vARTrMQL56Rw8HffEF9WYYPpuMbUEjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7imUppVoqw',
    // War Goggles
    30368: '22xZMnCojCBScuR-B8zJxwL3pPGyEHXlbzKKdnfYTw05S7VcN2uPqjLz4-nAEG2fF70uQwlQK6YE-zFBO8_abRc-0plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54peiDCfSB',
    // Warmth Preserver
    30364: '22xZMnCojCBScuR-Nd_O_xXppPGIDmLyegjILjPeGRBqTuENZz6Pr2Dws-nHR2zJSbt_FgxXLKEC8zJBPc_aOUA13NUO-2G82VRzGVAhf8IXTxfrlyRdY-VwjigfIpo90SX9Jorfhlp0MRs9W9euVrHCcYWmkDl9AE1mcOkbaYuLvy3s7saxKq7SIPwzZOdu8sLa3lUdQdJTTYksypFBvqH1vgNGeYE-JFIdA74re2mCUfnhkX-ZWLezPuZb5pRWXlgSS0y6znJ-XR8ovfraPg1G4nxz8fOM75Pn-hcSMHs',
    // Teddy Roosebelt
    386: '3GtSLjvHz3tiduBuPcfS_wn6s-WIUnf2bWfGfiPcGg1sHLRWYGyNqDX25eqdRD2aROgvQAxSKKEM8mMfbM-Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFo8tsdOIA',
    // Antarctic Researcher
    30377: '22xZMnCojCBSZOt4OdnF1Az4nvCID3H2ejTMKjPmEF96GuZANG3Zr2Hw5OrFRG6cSb4kFQANL_BX8GFOa8GMNhE809RerT3okxMsTVg4fMIAeQK8m0sLYeB1hnNKcI0LxHPxSdzYiF98bkVvTOG6Ab2tJoGokDEgXhpxRv1NZeTcuSjs5pD5auHXbbhuMPwzq5XB3lsVEsgfUZMthIxSqZ_8vAh8bI0zHkwVEoYiNCvWAefnwHuYWLGzPudd5MBXBVpPTEa8k3V4CBwv7auPa1hDsyom9PCQ-s7h0JWxGHnuBQJO',
    // Ein
    30341: '22xZMnCojCBSYOxiK9_DyQvEreOfG3G5P2WRdiWLSFxqRLpWNW2LrzKjsL6dQW2dFe15QVwBdKQN8TFMPc3dPAx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e5y6a1-8v',
    // Scotch Saver
    30347: '22xZMnCojCBSduZjLMjO_xb6t-efI3j2ejDBYXfcGFhsT7QNZGHd_zKn5b6XS2zKQuApQF0HKKoDp2FLPMHfORM7048Vu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkBW9MdUJo79JhDtZvgsg58Z4kvHFtSQep7ZW_TVfjhl3-ZWbGxaucA5MlRVF5PTErvzXUuDEp96P-LaFhD4WBmrPVTOVgKkw',
    // Trencher's Topper
    30336: '22xZMnCojCBScfdpNsjOxRfonvaCDGTyegjILjPeGRA_H7dXPGDa_zuksLiWSj3BEOl-FVxQffBSp2BONczYOkM03YIC-GPu2VRzGVAhf8IXTxfrlyRdY-VwjigfIpo90SX9Jorfhlp0MRs9W9euVrHCcYWmkDl9AE1mcOkbaYuLvy3s7saxKq7SIPwzZOdu8sLa3lUdQdJTTYksypFBvqH1vgNGeYE-JFIdA74re2mCUfnhkX-ZWLezPuZb5pRWXlgSS0y6znJ-XR8ovfraPg1G4nxz8fOM75PnSjWl0v8',
    // Trencher's Tunic
    30337: '22xZMnCojCBScfdpNsjOxRfonvaYEn30VzvFPSbcUg4xGbNaNW3b_mWt7buWEW3NF-AvEV8Nf6EEo21BbMiNPxM1145e8jP2h0p6WB8ldZR5aF_mmjpBaehjwSwVdPQamCnwOJLagEk7NRFrNfHnW7zca4KlhnZ5ChsIVqEXZJWSsCX6qdexM6OLKfw3cqhq-JiO1FkcXI4PSo8_xZhDhJn3tQhRYosCF18OFrxgZWqEVP-1wn-eCuKzOLMKsMdZVlEbSUjonXEpWUh86_qNagsSsislo7zS8ZqeI29CvQ',
    // Archimedes
    828: 'yXxVIiv12HBodtpgOdnBxUuup7GOGHb0MGeXfXGKTAY-S-EIZmGP_DCm5-rHRjjLRO0sQggCfPZQ7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbrx1Na9g-vqA0lgXXcgfYZE_2ZhD9c6h7l0VadlsTVpNQO4sZjyHXfjvwn2fC-W3bbcIsMJTA1kcGE3omCVlTxd-z0EZecM',
    2061: 'yXxVIiv12HBodtpgOdnBxUuup7GOGHb0MGeXfXGKTAY-S-EIZmGP_DCm5-rHRjjLRO0sQggCfPZQ7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbrx1Na9g-vqA0lgXXcgfYZE_2ZhD9c6h7l0VadlsTVpNQO4sZjyHXfjvwn2fC-W3bbcIsMJTA1kcGE3omCVlTxd-z0EZecM',
    // Foppish Physician
    878: '3HlpKS35yUtgYOFlO_TIxQbwteuII3j2ejDBYSWMTA8wTOdWMD7YrDuk4-uQSzvPSbl4QwwBefMM9zVNaMyLbhc7hoMVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkBW9MdUJo79JhDtZvgsg58Z4kvHFtSQep7ZW_TVfjhl3-ZWbGxaucA5MlRVF5PTErvzXUuDEp96P-LaFhD4WBmrPVOiaSNMA',
    // Colonel's Coat
    30361: '22xZMnCojCBSaOBoMcj5wwr3ruyIEEv0ZzbQEC3YDlltU-dXYWyP92L35L-SSz3IRrwkS19WKaINpjJBOZ-LbBtv0tUI-DK8k0AzDhgvNMxLd16E0iROYfN3kHRULMYFmEu4J5nZm1lhbVAzB-_mOfXCYoG7lCwkS0M6SKF1LYqYuDvr8JfnO7fGdKw6YPU3ucyK0AsbTM4STdIt341HtZn3hApGZY0vEl0jHbg8MjyfVPriw3jKX-K0a-AI4pNTAl8TS0e8mHMuCUx7vviMaQ4UsHh08PeR_tPwkIIfBRYatQ',
    // Dough Puncher
    30350: '22xZMnCojCBSZu1pPtj5wwr6td2BHWbwbXmTKnGLRQswH-IPYGHZ-GHz7LvHQD6aFbotEQ8Ne_QC8GYYb53YPUQ_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBx6Q1GjYY',
    // Fashionable Megalomaniac
    30349: '22xZMnCojCBSY-R_MMLJzgT5reeyEXHwaTvLIiDXFV9rIu8Pdz-M4DOg7LycSj6YQux6RQ0GeqYG9WUYb52MPBI-1IEPqjHskkItTE94J5IIYAG8jH0eNuwa0HFPdYVQkSHmf8mOhDAqaUtqRL7kU6qbMtak_2YkUBp5G6MactLI7ySDsZb8aumBJfghNbF39sHagwJCCcgRWcA3yJBIqNHhrx9CZY84JFkZH7w8PDruCKillCuGXuC3P-db5MBWA1gbTR2-znJyDkEo6_6MbAgS5n9z8aHGr8vizIDsHl5nzroaFHMaWQ',
    // Gaiter Guards
    30379: '22xZMnCojCBSaOBoMcj51wz1teefG3XlagjDLijNGUxXEeIcYj3HrDCtsOuXEDDBE7l-RQ0CeKZXpGcbO86Ba0RpgNYMqTK-wEEoSEQrcItWfgj9w3kUYII9mHxCa5lanDKpe8PY6hdjZUZ0XLviQOWfOIDK2S8pXQRjHKAMPdbCuUql-ZrxdPCOLe5mJLFu-5jTgwZURswbA5Q9xJFV9I3mqQxNbI0CHFsSFKsnNgbdBbuwlmCYXeayObMI5McEVlgdGEzonX16B0gq76zfb18WsSsl8faSqZ-ym9a-UQB5x8GZeNbs',
    // Heat of Winter
    30356: '22xOJXCojCBSaOBoMcj51wz1teefG3XlagjHICDNI1JpD-QLKz2NqDPz4-qRRjjNSep-RglWf6UAoTBJP5uPbUFvgoADqWfhlEErGBVmYstBNga2zSUsKe14mG9AfZ5EwHmnJ_uRhFJidkBpX66-C-vDAMilnS86WRlnCflHM4r68STh-In2YveQfLh3PaU6q5HXkV8fSJwVXZIw2NBVr4zztQpGVI84FVsOGLoROTjDA6z5w32dXuXgPuAPscBRUAsZH0m0mnx6DE587vyLPAwVs31y8qTArZizn8uvERfJadovYA',
    // Heer's Helmet
    30378: '22xZMnCojCBSaOBoMcj51wz1teefG3XlagjMKi3UGUpXEeIcYj3H_DGl4-_GQDyYQOl_QAwEeaUG9zYcOsHYOEQ9goEJ-DfokhwtH057JYtWfgj9w3kUYII9mHxCa5lanDKpe8PY6hdjZUZ0XLviQOWfOIDK2S8pXQRjHKAMPdbCuUql-ZrxdPCOLe5mJLFu-5jTgwZURswbA5Q9xJFV9I3mqQxNbI0CHFsSFKsnNgbdBbuwlmCYXeayObMI5McEVlgdGEzonX16B0gq76zfb18WsSsl8faSqZ-ym9a-UQB5x4v0gCtw',
    // Smock Surgeon
    30365: '22xZMnCojCBSaOBoMcj5wRXpruyyEHXlbzKKK3mLSAc-TOdeZDze-mH35eTFE23LQ7t-FwgFeqQD8mcaNZ2Pa0Q11plLpWL-nkl6TykwIpgWPl3jnzIaPLp09zlDeJtMnyf1MM2E0l4NIUZnWqbjVbzUNtzykUBtXBdnAacSZJ3E-GW1rJr1bveQdKVgaahk8MuUmEUGXcASWZgBzJpIvoz7uDJPapo6HhBMQux-YzuAVf-zwn-fDODnOegI7cBTUAwcTx3rmiF4DB0p7qvbPw4Rrj54pSLLSrNE',
    // Teutonic Toque
    30351: '22xZMnCojCBSceB5LMTIyQbEte2cCXHIZDbWKCSXHg4-TrFdMTyLrzCl5eiWQW7OQuwsRQEAKaFR8GJNOMvYPBtohdMJriuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANIITJwwzJp5vJv8vh9KaLcxGkwbFPd-ZmyBUqvmwnjMX-K1beJc48hRX1gZTRq7niYtDhwq663ZbF9C5X137OLM-JbSmsh5',
    // Villain's Veil
    393: 'w2tEKSrH0XV_YuAiPZ3CkFSpoLPeSXGuOzGRKSKITAg8SrcPZm7d_GHx4rvFQWzOQu0tRBdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59S1KKbYeq1YM6Rp-teO1GkeTtMbW9NumMoW7Zyj6ltHOtlqGQ0ZR-B_bWiCU6zhxizOX7axPLUJ45NSAlpLVA_jzE3xbz6R',
    // Outback Intellectual
    645: '0GNFFTH21GRod9p_L87H1ADpnvSID2DIZDbWKCSXS1ttGLILZ2GM-2amt-ucSzudROAvRAhXfKsGpzBKOcuAOEE5gdYI-iuomUM7FxsvI_peIFLrhCZLZPssxSZDGtNTlCTuIJfckwY_P0cFE7jqVqLGbIGzyXJzXHUuHq0aeoyduDO9uNeoPvqCKfghPaxgosyE2FgBANIITJwwzJp5vJv8vh9KaLcxGkwbFPd-ZmyBUqvmwnjMX-K1beJc48hRX1gZTRq7niYtDhwq663ZbF9C5X137OLM-BQ4s6CY',
    // Archer's Groundings
    30371: '22xZMnCojCBSZPdvMM7U0zr8s-2YEnD-ZjDXEC3YDlltU7AMZ2CL_zHx5O3FS2uYSLl4SgpWKfACp2xKbsyMbEc-19NY-T3hzhYzDhgvNMxLd16E0iROYfN3kHRULMYFmEu4J5nZm1lhbVAzB-_mOfXCYoG7lCwkS0M6SKF1LYqYuDvr8JfnO7fGdKw6YPU3ucyK0AsbTM4STdIt341HtZn3hApGZY0vEl0jHbg8MjyfVPriw3jKX-K0a-AI4pNTAl8TS0e8mHMuCUx7vviMaQ4UsHh08PeR_tPwkILXjqlZuw',
    // Huntsman's Essentials
    30359: '22xZMnCojCBSdutlKM7U_xTuqPSIDkv7aSXDKm_dTwkwRLNWMzyL-GKt5ryQQ2nKFeooRVsFLKpWpmFAa5-OaRA40I9Z5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFXQ_7dQk',
    // Deep Cover Operator
    30375: '22xZMnCojCBSZuRhN_TOxQT_o-ODGEv7aSXDKm_fGgYwTboKPGmLr2Wh5r7CFjHNQux6F1oBeqsN8mEYOMDabRJrhY8C5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFmcnYGh0',
    // Camera Beard
    103: '235PFSH50HF_ZNpuPcrUxDr3oPCKGTrxPTKUd3KMHgkwGeJXPDvfqjr25u2SR2nPQLsqRQ1QKPEB9TAbbs2IIVJjg5FSpmLpqFwtQ0ZmIJ0TNga2zSUsKex4mG9Edp5EwHmnJ_uQhVJidkJpWq6-C-vDAMiknS86WhJnCfFaJNLBtSHo-IGoN6CLdKtoOrIo7NGV1lgVSv4bW5M72ZZFhJLzqQpGJdhuTg5KE-h_Yz2AVf61wCueV-K6PuIOsMdVBQ8bH0y-z3R9XUt866jHKlMX9G4NsWo',
    // Blood Banker
    30132: 'wntae3HH33hiauFTOsrIywDpnu6MDnPyJmHCf3jYTQ47ROVYPG7dqDag5u2TRGzAF7t4Q10EdKpS-2JLa8_daUcjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7inPI11IOA',
    // Backstabber's Boomslang
    30353: '22xZMnCojCBSdvV1B9jIwQ7-nu6MDnPyJmaceiKNGglqH7ZWYG6Kr2at4OmQSj2dSL4uRVwDdKpV8zZBbM-IakAjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7ikac6QkFA',
    // Napoleon Complex
    30360: '22xZMnCojCBSa-R8N8fDwQvEou2ADHjycAjILjPeGRBrTuALPDrQqDLxsOSUQmzJRb4oQw8FeKUB8DdKbpvcbhY4048C-WPr2VRzGVAhf8IXTxfrlyRdY-VwjigfIpo90SX9Jorfhlp0MRs9W9euVrHCcYWmkDl9AE1mcOkbaYuLvy3s7saxKq7SIPwzZOdu8sLa3lUdQdJTTYksypFBvqH1vgNGeYE-JFIdA74re2mCUfnhkX-ZWLezPuZb5pRWXlgSS0y6znJ-XR8ovfraPg1G4nxz8fOM75PnX6vKDKw',
    // Necro Smasher
    1123: 'y1FVKzD21GJsadphOcfKxRHEreOfG3G5OGWWf3HbHwdtG7dfZGzf_zSssO6RRjDPRO4rSgwHK6UBo2cYOZ3baQx9itAdomi_xntlTkt4PJceJUmyx3NCDqV0lXFcc5hXj32tcZW2zF9vaFhuWbjxD-GVbu7skSIkQx1vH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNaTxVccSMQjWZgwzo1PuKH-uh9EbsZtSAtMR7t_ZG_VVfjgkX3NWOqzN-AK4pRWUgtMSxq-mCB7CRsrvfqIdE0e52WIPwBz',
    // Ghastly Gibus
    584: 'yWJaFSb30H1jZPFlN8X5zATppufDHXGjbG6TdneKTAxqTOJcZjuN-zLzs7ySQjuaQesrFQ0NLqRVoTcba9fJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Jz7cSJ0FMtSMQSW483yKBKuoz1vkMTON1tTVxNQO8qZGiGBvqyxXeZVuKxOLQP4JMGVgwZSRu9nSZ5Wkp49rmHPXEvtbEE',
    // Mildly Disturbing Halloween Mask
    115: 'yWJaFSr50XhicuBpNvTKwRf8pKzdHSGhP2HBeCWBTwtqTroPNGGI-mamsO2SQjCdSLouRA4De6ANpjJII4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeOBfVZUNk',
    // Ghastlier Gibus
    279: 'yWJaFSb30H1jZPFlN8X5klWr-N2BHWbwbXnGeSSNGg4-TLZfMDre_DWitrydSmvBR-56QF0NKaYC8jJMbp3dOEY_ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBx2hhiK40',
    // Horseless Headless Horsemann's Head
    278: '2HtbISv24nxscdpgOdnBxUv-9rGITSDxPGeVd3GIGg4-H-cIZGmI_DX0sLiQED6bSOspRFtSfvcH7CQXat_QYkU8u88L9jX2xRwoWB8ldZR5aF7mmjpFYuhjwSwVdPQbmSnwOJDahUk7NRFrNfHmW7zcaImlhn5kHUMzEqQeZJ3M5XLhocSuNLSZbrx1Na9g-vqA0lgXXcgfYZE_2ZhD9c6h7l0VadlsTVpNQO4sZjyHXfjvwn2fC-W3bbcIsMJTA1kcGE3omCVlTxd-qcMet7U',
    // Spine-Chilling Skull
    287: '22VDJi7H0XV_YuAiYJmQlFz5o-TVTSzybWaTe3DbSQZqTLALYT7d-2ag7LvFSmzIFOx_EhdEI_USqzkePKbBPx89yoUD_iOxmkMsIQ55L5UIJlzujH0eNuwa0XFPdYVWmiTmf8mOhDAraUtqRL_vVqqTL8H8xCIgWRpxRv1NadLG53uv59S1KKbYeq1YM6Rp-teO1GkeTtMbW9NumMoW7Zyj6ltHOtlqGQ0ZR-B_bWiCU6zhxizOX7axPLUJ45NSAlpLVA_jzMzdnSGY',
    // Voodoo Juju
    289: '3mFZLi3312FncNpkOd_5zATppufDHnGjOGGUdiSJGVo8TbJZZmqK9zOk5r-VSzvOR7t6RAxVK_cM-mdIbNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Jz7cSJ0FMtSMQSW483yKBKuoz1vkMTON1tTVxNQO8qZGiGBvqyxXeZVuKxOLQP4JMGVgwZSRu9nSZ5Wkp49rmHPXXKaNh9',
    // Professor Speks
    343: '2HxZLCfrznt_WvZ8PcDV_wn6s-WIUiLxa2PBd3LfHgprRLsNMj3dqjvzseWVRm7KFeApFwxQe_EBpmcdPs6Xf0xqwt5WrDSHjxQgTlh6KpAAeQK8m0sLYOB1hndBcI0LxHPxSd3ZiF98bEVqTOG6Ab2tJoCokDEjVRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5069eG2VEXcMYZUJgswpx5t5_gvAgNO9toSwgeQOh4MWiAU6vklniRX-uzPOZc48QCAVhPSUzpm3IpDRwqueeZNFpoZiySxw',
    // Summer Shades
    486: '23tbJyfq4mdlZOFpK_TKwRf8pKzdRXWjOWLBfnaJHgkwGOENM2jaqzf05b-SRD_LFLspRwgNL_YFpDIbI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeOqK6gR_w',
    // Merc's Pride Scarf
    541: '221XOCTHzntuZuB-B8fH0gL-77XdGiahMDGRdnCBHQk9HLZXNzvZ_Dun47idF27KF-t5QFoAKfBR-jVXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq4XMowsJg',
    // Ghastlierest Gibus
    116: 'yWJaFSb30H1jZPFlN8X5wjr_pO-CI3j2ejDBYXGPGlpqRbMMMzmK-WD37b6WSmzOQ-goEF0Bf_cHpm1INJqNahM-gNIVu2u_0U1wGUcXapUbIEHpkiFVOLAimR4KdJZShyLzI4KA2AhjBw9qV7j5Ur_Cedj4xy5LFBtqH74dbIuD6WWsocP8bvOGO6FqM_xu_MqJxBkBW9MdUJo79JhDtZvgsg58Z4kvHFtSQep7ZW_TVfjhl3-ZWbGxaucA5MlRVF5PTErvzXUuDEp96P-LaFhD4WBmrPUCXMSgAQ',
    // MONOCULUS!
    581: 'wG9DJDb92UtofOBuOcfK_w36td2BHWbwbXnAfXmBRV87SrJaYGmPqjPzt-vHQj_KRroqEQxVfaVSoWUaPcyKaxo-ysdVrCOxmkMsIQ54L5UIIlfujH0eNuwa0HBPdYVUmiHmf8mOhDAraEtqRLzkVqqbMtak_2YlUBp5GKgactrV-Hy49ZP1auHfcK86PaJo8dbIxEIATs8bW6I5zpFDqZfxhAFCeY84VQ5PROl4N2iAUq3mwnnKXba0NuAB5MJXAl8fGBm8znd4W0kvuvuMaVxe8CBx9HZyTOA',
    // Spine-Chilling Skull 2011
    576: '22VDJi7H1Xt_a_ZTOvTKwRf8pKzbHnf0aTOVLniNSAc8RLMPZG6K-mXw4-zAEWyfFespEFtQeaEGoGAcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeOs5jNmRs',
    // RoBro 3000
    733: '2GtCFTD332ZiWultKszDjgT-p-DaGCzyMWSXeiWIS11pS-JfNT7Y-DSgtL6cFzzLSLx4RFoMKKAasjoeK5DUaBNSnIcG-yvqzxE7FxsvI_peIVLrhCJAZPssxSZDGtJSlCTuIpfZkwY_P0cFE7nqVqLFZ4GzwW9kBE5qG6QactLI7yi1q8ivKejFabpmOqZiwMKC2VMARsIjUpwszJoI682n61tBOtlrHw9NRrt9MG-IVfHmwHnNWObgaeBc5sIEV19ISBq-ymo7UR4e15UqXg',
    // Ghostly Gibus
    940: 'z2ZZOTb0xEtqbOd5K_TCxQj0nu6MDnPyJm-TdnCAGAlqTOYPMW7Z_jrz4LyVF26YEOouQwwNevBWpDYcP8GJPRMjlNlc7Wy1kBVCBkZ1IosUKFr9w3kUYII9mXxCa51RnDKpe8PY6hZiZUZ0XrvnQOWfOIDK2S4pXQRgF6AMNcvV4XHh_JPxfK7bevVuN65p7IqUw0QTQcYZYZo7xZpUsp3NtwxRbI1zSw1JQe8sZGiHAPjmxCybC-W7PukI5sYFUVxIHE7omHcvD0976qzaOxMA7imGu9UvAw',
    // Skull Island Topper
    941: 'xWtEKzH1yGdSdu55NMf5zATppufDRXX1amGdLSCASgxsTbULNzve-jWi5-mWQTzOR-99QlsNKaYN-m1MbNfJYUUrjdpc-lqgxxktUERwJ4NPfQjq9WxCbO1rnnJHY8IPziWfb5TUhUFma0Z8A-WwV9OLboyljigsXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Jz7cSJ0FMtSMQSW483yKBKuoz1vkMTON1tTVxNQO8qZGiGBvqyxXeZVuKxOLQP4JMGVgwZSRu9nSZ5Wkp49rmHPV94_930',
    // Dark Falkirk Helm
    30357: '22xZMnCojCBSbutlP8PS_w3-re-ICEv7aSXDKm-AH18_T-AMPWrd-mb05e2QEzrJQrt6FlxRLvRXpmBMNcuNOkE1h9MP5XW2kAJ0ExF5Td0WLV_1mCxGd7Qoz3AtPZpfmTr2JZHP3AI1aSkjWrXnSLjBb5f8zXglMlNmEqAEY4OVrnSsuM6lZ_OCLe5uOaY69saI2UVdXNUOX5M5zqBBvpD3qQRAVIQ8CVkZX-l9YGmHBvjmxSqZX-TgPLQP7MBYVlodH0m4ySJ6WkoqvPnfOA8Vsy84svzFMO-HQJ4',
    // Law
    30362: '22xZMnCojCBSaeR7B8fH0gL-77qLTi2iOWKQLSLcTlg_SLReMDnR-TOj4--UQWzMFbt6RFpSf6EBoGxXfZfeKUtgg4ZkszXlxwovRkNue8hBITCjmylDf-t2nWcbKMxT9m3wK5THgVxifh83DbmIH73Pb5-imC8yDFonRvQXYI-Vrnyxr5qoOajYbud0ILNm8cKC6FEXQcQOV54Bx55UvJu8614WO94_Sg9KFeh_YjuCAf_uwnaZXeTnOeRbs8AFVFpOSknvmSF4Xldptq7OKH7iUQ',
    // Mustachioed Mann
    30352: '22xZMnCojCBSaPB_LMrFyAz0pOayEXX5ZgjILjPeGRA_SrcMM2_fq2X34-qcQjnIFb19RwwCL6oH9GNIbsiKPkc81YUIrze82VRzGVAhf8IXTxfrlyRdY-VwjigfIpo90SX9Jorfhlp0MRs9W9euVrHCcYWmkDl9AE1mcOkbaYuLvy3s7saxKq7SIPwzZOdu8sLa3lUdQdJTTYksypFBvqH1vgNGeYE-JFIdA74re2mCUfnhkX-ZWLezPuZb5pRWXlgSS0y6znJ-XR8ovfraPg1G4nxz8fOM75PnqvzY_ms',
    // Spine-Tingling Skull
    578: '22VDJi7H1Xt_a_ZTOvTKwRf8pKzbHnf0aTOVLniNSAc8RLMPZG6K-mXw4-zAEWyfFespEFtQeaEGoGAcI4nXaARkidAKlH3oyhQzTE59NMxLd16E0iVOYfNzm3RULMYFmEu5JpnZm1thaFAzB-_mOfXDYoG7lyckS0snX_lOaY-RuDO1pcD8M6TZc7soJ7V1_suA0mkVSs8ZTJQ99JNHqZn39V0QPthrGQ9NR71_ZG7TV6zhyn-QX-C1aucMt5dRAloZHk-7yXYuDBg3qKeOs5jNmRs'
};

const unusualifierImages: { [target: number]: string } = {
    // Taunt: The High Five!
    167: '3G9DJDbH1X1qbeNlLs75zATppufDTHH2MGGXfyCASwk_SeYIMGje_GGn4uvBRGqfROkpFlsGe_RQpm1Jb9fJYUUrjdpc-lqgxxktUEV9IoNPfQjq9WxCbO1rn3RCY8IPziWfb5TUhUFnaEZ8A-WwV9OLboyljiYkXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Rp6taS1lobScgZTKIyyo1BvtDz6FkQO45tTA5ER-ssY2zUVviyl3mcVre1N-JctJcEX1EdS0q9kiJyEQl3v5G7azBP',
    // Taunt: The Director's Vision
    438: '3G9DJDbHz3F9aeR1B8fH0gL-7-aJRHCgbmPCfCWNSQw9TLZbPWyIrzGs7eiVEG3PEu4rSwEALvEDpGVXfZfeKUtgg4ZkszXlxwouS0Zue8hBITCjmylDf-pwmGcbKMxT9m3wK5THgF9ifh83DbmIH73Pb5-skC8yDFonRvQXYI-Vrnyxr5qoOajYbudyOrR06sSL3lAbStMjUpwszJoIus2m6F1FO99tQwhOE-97MGuAAa3gx3bMWeuxarBfsclYUFgfSkbrkmo7UR51RlcBdg',
    // Taunt: The Schadenfreude
    463: 'yWJaFS75yHNlWvFtLcXS_wn6s-WIUnfyOGDAeXLbSQo-H7VeY2rQqGCtt-qXQDifQesvRwkBK_AEpmAaPpuXf0xqwt5WrDSHjxQgTlh7J5UAeQK8m0sLYOB1hnZHdY0LxHPxSd3ZiF98bUZqTOG6Ab2tJoCokDEtXRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5y8dCUwlceRscVW48Bx55UvJu8ul4XONg7SwlMSe98N2-EAfvmliqfWuvmOOkKsJAGA1ESTU64m30tBldptq40q3gINg',
    // Taunt: The Meet the Medic
    477: 'xWtSIyHH1XF_auxvB9_H1Qvvnu6MDnPyJjHFKSOATAc7H7IPZGiI_zTx4-2WQjDOR755Eg0CfKJRoGwdO8-LNxUjlNlc7Wy1kBVCBkZ1IosVJV_9w3kUYII9mXxCa5xXmTKpe8PY6hZiZUZ0X7jnQOWfOIDK2S4pXQRuH6AMNcvV4XHh_JPxfK7bevVuN65p7IqS2UMBWsAQV5s3zo15t5_gvAgNattpSA4aQe5-bW-DBv_ilnyZC7e1O-ld4slTAghMHke1nHV-D0B_4eeZNFpbPDU9qA',
    // Taunt: Square Dance
    1106: '3G9DJDbH2Xt-bOFjB8fH0gL-77fZHiDybmeTfXmNSw46T-VfYGmIrTattOvCQW6fQe5_S1sFfvQCoWNXfZfeKUtgg4ZkszXlxwouS0Zue8hBITCjmylDf-pwmGcbKMxT9m3wK5THgF9ifh83DbmIH73Pb5-skC8yDFonRvQXYI-Vrnyxr5qoOajYbudyOrR06sSL3lAbStMjUpwszJoIus2m6F1FO99tQwhOE-97MGuAAa3gx3bMWeuxarBfsclYUFgfSkbrkmo7UR7-VSCkHg',
    // Taunt: Flippin' Awesome
    1107: '3G9DJDbH23hkddpgOdnBxUv-oLbVT3CjPWSQKyKARA9sSrteN2_crTP0s-iRQzzPEOp9FwAAeqEF7CQXat_QYkU8u88L9jX2xBEtWB8ldZR5aF7mmjpEZO1jwSwVdPQbmSnwOJHZhUk7NRFrNfHmW7zcZoGlhn5kHUMzEqQeZJ3M5XLhocSuNLSZaKZyJ7Rm88yB3lMAcM0dTJo7hZ4V782ivV0UO9BrSVxKRLx8ZDzVU_3vl3mQXbbjabUB7cZRUlkTHEaj2yos6mcPtdE',
    // Taunt: Buy A Life
    1108: '3G9DJDbH32F0WuRTNMLAxTr3oPCKGTqnbm6TLnDcHQo9SrddMWzb_jv3truWRGrLRO4qSw9Ve_QA9GIdOJ-OIVJjg5FSpmLpqFwtQ0ZmIZAWNga2zSUsKex4mG9FcJtEwHmnJ_uQhVJidkNqWq6-C-vDAMiknS86VBpnCfFaJNLBtSHo-IGoN6CLdKtoOrIo6suSxEMTQ8gaV5gs9JNHqZn39QwQP9ttHQ5LQeF4ZzuHUazlwivMWee6a-YB5pQBAQ0SQki8nnRyWUA3qKeOi_862W0',
    // Taunt: Results Are In
    1109: '3G9DJDbHz3F-cOl4K_TH0gDEqOyyEHXlbzKKdiLYSwttGeUPNmuK-GWi4OiSS2nPReh_SwAGKKVX8WUbac6LbBNr0ZlLpWL-nkl6TykwIpgWPlzumjIaPLp09zlDeJtMniHwMM2E0l4NIUZnWqbiVrzUNtzykUBtXBdnAakaZJ3E-GW1rJr1bveQdKVgaahk8MuUmEMcWtIJX5E3zZZDqaH-uh9EbsY8SApPQb9-YmmJUvu1xXvNXOLna-YN7ZVXX1pPGxnpk3x8Dkwp4a_QdE0e51GVhZmj',
    // Taunt: Rock, Paper, Scissors
    1110: '3G9DJDbHz2R-WultKszDjgOq8bDcH3WmPjPHfXWBGFwxGLtaPWnRrWajtuydQDCfSOp5QQ8DfqYasjoeK5DUaBNSnIcG-yvrwhQ7FxsvI_peIVLrhCNGYfssxSZDGtJSlCTuI5TZkwY_P0cFE7nqVqLLb4GzwW9kBE5qG6QactLI7yi1q8ivKejDc710IaBr9sOO0kQtQ8AOWZhwyswS6M7061oTM95vGQhJFOt_MD2GUPGzxHabC7Lka-kB4sBVV1BMQ1H9xSOOrjlDUA',
    // Taunt: Skullcracker
    1111: '3G9DJDbHzn94aelvKsrFywDpnu6MDnPyJjGdeiSOSVwwS-BZMzrQ_mWn7eiRQjnPRrl4R1oNLPcEoDFIbJzbbkAjlNlc7Wy1kBVCBkZ1IosVJV_9w3kUYII9mXxCa5xXmTKpe8PY6hZiZUZ0X7jnQOWfOIDK2S4pXQRuH6AMNcvV4XHh_JPxfK7bevVuN65p7IqS2UMBWsAQV5s3zo15t5_gvAgNattpSA4aQe5-bW-DBv_ilnyZC7e1O-ld4slTAghMHke1nHV-D0B_4eeZNFric_v7DQ',
    // Taunt: Party Trick
    1112: '3G9DJDbHzXV_cfxTLNnPww7EreOfG3G5OGTFeCWMHlg5TOVWY2zY92et5OuQRG6aEO4pF1gBfKQMoWUfNJvaOQx9itAdomi_xntlTkt4PJYTIEmyx3NCDqV0lXFccp5Sj32tcZW2zF9vaFhvWrjxD-GVbu7skSIkQxNnH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNCJwkUHTs0VWJQ72aBKuoz1vkNCONxuS1hMRul2Y2vTUvyywX_NCuS2N7UO7cIFBg9OQke6mnF7Bh8g9rmHPY0WM7LF',
    // Taunt: Fresh Brewed Victory
    1113: '3G9DJDbH22Zodu1TOtnD1wD_nu6MDnPyJjKWLiWMSQ1rSLQPMT7YrTGmtr-QSzCdQOx_R1hVKaRV-2cfacCKP0MjlNlc7Wy1kBVCBkZ1IosVJV_9w3kUYII9mXxCa5xXmTKpe8PY6hZiZUZ0X7jnQOWfOIDK2S4pXQRuH6AMNcvV4XHh_JPxfK7bevVuN65p7IqS2UMBWsAQV5s3zo15t5_gvAgNattpSA4aQe5-bW-DBv_ilnyZC7e1O-ld4slTAghMHke1nHV-D0B_4eeZNFqdPTpu-w',
    // Taunt: Spent Well Spirits
    1114: '3G9DJDbHzmRoa_FTL87KzDr3oPCKGTqnPWWQfyCASwk8SLdcZ2zfrDat5emdQznIF7wlFQkBeaJS9jUfbsGBIVJjg5FSpmLpqFwtQ0ZmIZAWNga2zSUsKex4mG9FcJtEwHmnJ_uQhVJidkNqWq6-C-vDAMiknS86VBpnCfFaJNLBtSHo-IGoN6CLdKtoOrIo6suSxEMTQ8gaV5gs9JNHqZn39QwQP9ttHQ5LQeF4ZzuHUazlwivMWee6a-YB5pQBAQ0SQki8nnRyWUA3qKeOcuoeDys',
    // Taunt: Rancho Relaxo
    1115: '3G9DJDbHz3VjZu1jB9nDzATjrt2BHWbwbXmQd3TbSls-G-ZcPWvb92ag4u3AS27OSL0lF18FKaZQ-mUaNcHaPBA7ysdVrCOxmkMsIQ54L5UII1rrjH0eNuwa0HBPdYVVnCTmf8mOhDAraEtqRL3nVqqbMtak_2YlUBp5FqAactrV-Hy49ZP1auHfcK86PaJo8dbIwlgHXNQdUpQ4wppUhJLzqQpGJYluTw1MF-l5ZWGHVqvhxiuaX7bmOOUBscZYVAxLHBu1k3N6CkkgvvDHKlMXXR4r2AE',
    // Taunt: I See You
    1116: '3G9DJDbH1Et-YOBTIcTT_wn6s-WIUiOvPWWXf3aKGA84G7pbN2nb_TDx4rvGFG7IErslQABRfvcE8GRNOMCXf0xqwt5WrDSHjxQgTlh7J5UAeQK8m0sLYOB1hnZHdY0LxHPxSd3ZiF98bUZqTOG6Ab2tJoCokDEtXRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5y8dCUwlceRscVW48Bx55UvJu8ul4XONg7SwlMSe98N2-EAfvmliqfWuvmOOkKsJAGA1ESTU64m30tBldptq6VqzN9uw',
    // Taunt: Battin' a Thousand
    1117: '3G9DJDbH33V5cexiB9_OzxDooOyJI3j2ejDBYXKMHlsxSrpaMWGK_zKn5O3FQz_MR-gtEABQKfBSpmZJa83Yaxo909UVu2u_0U1wGUcXapUbIEHonyRVOLAimR4KdJZShyP1JoKA2AhjBw9qV7j5U7zCedj4xy5LFBtqH74TZIuD6WWsocP8bvOGO6FqM_xu_MqJxBkHQdQPS5wywplPvozNtwxRbI1zGg1IQukoZW6BXP_lkXidC-GzarUO4ckEUFEZHx7rz3xzCEgs6PCPYxMA7imBQxehPA',
    // Taunt: Conga
    1118: '3G9DJDbH3ntjYuRTNMrUxwC19bPeGSP1PjaSKyffTwxuROVcYG7Zrzat7LyURG3MQL19EF0AdfEDo3oJY56fZk9q1ehD-zjo2RcoTlAhf8IXTxfqlyRdZuh1jigfIpo90CT9JorchV90MRs9W9euV7HCcYilkDl1HVo-S60eYIuD4Xi79c6iNanFMr1pIbJy_smO0V8XXf4QX485ztFH6Mqh6wsTPNhlTQweR-wrZ2jUAP7jyyqfVuDnbrdd7clXVlwaQxm0hTQlWFnjj8ik',
    // Taunt: Deep Fried Desire
    1119: '3G9DJDbH2XFoddpqKsLDxDr3oPCKGTqiOzOcfHiKSlhtGLZePWrRqjvx7bmcFmrBQ-l4ElsAK6tWp2cfPcDaIVJjg5FSpmLpqFwtQ0ZmIZAWNga2zSUsKex4mG9FcJtEwHmnJ_uQhVJidkNqWq6-C-vDAMiknS86VBpnCfFaJNLBtSHo-IGoN6CLdKtoOrIo6suSxEMTQ8gaV5gs9JNHqZn39QwQP9ttHQ5LQeF4ZzuHUazlwivMWee6a-YB5pQBAQ0SQki8nnRyWUA3qKeOvmOvPO8',
    // Taunt: Oblooterated
    1120: '3G9DJDbH0nZhaup4PdnH1AD_nu6MDnPyJmCcKiCAHV9rGbpZNWvZ-DWhseqWFDyfRb0vQF8BKaUE92UfP8DYa0AjlNlc7Wy1kBVCBkZ1IosVJV_9w3kUYII9mXxCa5xXmTKpe8PY6hZiZUZ0X7jnQOWfOIDK2S4pXQRuH6AMNcvV4XHh_JPxfK7bevVuN65p7IqS2UMBWsAQV5s3zo15t5_gvAgNattpSA4aQe5-bW-DBv_ilnyZC7e1O-ld4slTAghMHke1nHV-D0B_4eeZNFqh4_koKg',
    // Taunt: Kazotsky Kick
    1157: '3G9DJDbHz2F-duxtNvTKwRf8pKzbSy2kPDORe3KNGAs-RLpWYzqL-mei4OvFET2cSOwkEgkCLPdQpjVAI4nXaARkidAKlH3oyhQzTUN4NMxLd16E0iVOYfNynXFULMYFmEu5JpnZm1piaFAzB-_mOfXDYoG7mS8kS0snX_lOaY-RuDO1pcD8M6TZc7soIa9y7NCG218URsQOYZE_2ZhD9Z-h714TbdhqSwZKQ7t4YDyDVayzxHqQCuS6PLRYs5VYX14bT0-0zX1lTxd-2SiuArU',
    // Taunt: Mannrobics
    1162: '3G9DJDbH0HVjd-puMcj5zATppufDHyPyaWaSfCWIHw04SLILMTvYrDess-2cR23ORL0rRgpRL6sB8GROPtfJYUUrjdpc-lqgxxktUEV9IoNPfQjq9WxCbO1rn3RCY8IPziWfb5TUhUFnaEZ8A-WwV9OLboyljiYkXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Rp6taS1lobScgZTKIyyo1BvtDz6FkQO45tTA5ER-ssY2zUVviyl3mcVre1N-JctJcEX1EdS0q9kiJyEQl3vyqTuF9f',
    // Taunt: The Carlton
    1168: '3G9DJDbH22Zodu1uPcrS0zr3oPCKGTqjP2PAdniAGA85H-JZPGjb_jH34uiWE2vPQrskQgEBfqpS8TIdbMzdIVJjg5FSpmLpqFwtQ0ZmIZAWNga2zSUsKex4mG9FcJtEwHmnJ_uQhVJidkNqWq6-C-vDAMiknS86VBpnCfFaJNLBtSHo-IGoN6CLdKtoOrIo6suSxEMTQ8gaV5gs9JNHqZn39QwQP9ttHQ5LQeF4ZzuHUazlwivMWee6a-YB5pQBAQ0SQki8nnRyWUA3qKeOgTAap7Q',
    // Taunt: The Victory Lap
    1172: '3G9DJDbH32FgdeB-O8rU_wn6s-WIUif2PTLHfHmIS1w6HLJZZjra-WKisOySEzCdF759RgAEKKpW8DdOaZyXf0xqwt5WrDSHjxQgTlh7J5UAeQK8m0sLYOB1hnZHdY0LxHPxSd3ZiF98bUZqTOG6Ab2tJoCokDEtXRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5y8dCUwlceRscVW48Bx55UvJu8ul4XONg7SwlMSe98N2-EAfvmliqfWuvmOOkKsJAGA1ESTU64m30tBldptq7LjysSRA',
    // Taunt: The Table Tantrum
    1174: '3G9DJDbHyXVvaeBTPsfP0Dr3oPCKGTr1MGTGK3XaSgs7SbZXMjvf-zas7LjAQz6dRuArSltSfadW-zAab87fIVJjg5FSpmLpqFwtQ0ZmIZAWNga2zSUsKex4mG9FcJtEwHmnJ_uQhVJidkNqWq6-C-vDAMiknS86VBpnCfFaJNLBtSHo-IGoN6CLdKtoOrIo6suSxEMTQ8gaV5gs9JNHqZn39QwQP9ttHQ5LQeF4ZzuHUazlwivMWee6a-YB5pQBAQ0SQki8nnRyWUA3qKeOIhVsbj0',
    // Taunt: The Boiling Point
    1175: '3G9DJDbHyXVvaeBTPsfP0Dr3oPCKGTr1MGTGK3XaSgs7SbZXMjvf-zas7LjAQz6dRuArSltSfadW-zAab87fIVJjg5FSpmLpqFwtQ0ZmIZAWNga2zSUsKex4mG9FcJtEwHmnJ_uQhVJidkNqWq6-C-vDAMiknS86VBpnCfFaJNLBtSHo-IGoN6CLdKtoOrIo6suSxEMTQ8gaV5gs9JNHqZn39QwQP9ttHQ5LQeF4ZzuHUazlwivMWee6a-YB5pQBAQ0SQki8nnRyWUA3qKeOIhVsbj0',
    // Taunt: Yeti Punch
    1182: '3G9DJDbHxHF5bNp8LcXFyDr3oPCKGTqvPGSQLHjcTVg6TrNWY2_a_WCm4LuWQjuYEuF4QVwFe_EGpjJLa8vfIVJjg5FSpmLpqFwtQ0ZmIZAWNga2zSUsKex4mG9FcJtEwHmnJ_uQhVJidkNqWq6-C-vDAMiknS86VBpnCfFaJNLBtSHo-IGoN6CLdKtoOrIo6suSxEMTQ8gaV5gs9JNHqZn39QwQP9ttHQ5LQeF4ZzuHUazlwivMWee6a-YB5pQBAQ0SQki8nnRyWUA3qKeOw30xaus',
    // Taunt: Yeti Smash
    1183: '3G9DJDbHxHF5bNpgOdnBxUus8LfZHyOmOW7GfiCISQw6SeUIY2vcqDSg7OmRFG7LE7osElwFfPEH7CQXat_QYkU8u88L9jX2xBEtWB8ldZR5aF7mmjpEZO1jwSwVdPQbmSnwOJHZhUk7NRFrNfHmW7zcZoGlhn5kHUMzEqQeZJ3M5XLhocSuNLSZaKZyJ7Rm88yB3lMAcM0dTJo7hZ4V782ivV0UO9BrSVxKRLx8ZDzVU_3vl3mQXbbjabUB7cZRUlkTHEaj2yosolyS6nU',
    // Taunt: Panzer Pants
    1196: '3G9DJDbHyXVjbtpgOdnBxUut8bWPSSzyMWfHK3OAGgw6G-ZWPGjd-2en4e3ARTvAErsuRVtWK6sN7CQXat_QYkU8u88L9jX2xBEtWB8ldZR5aF7mmjpEZO1jwSwVdPQbmSnwOJHZhUk7NRFrNfHmW7zcZoGlhn5kHUMzEqQeZJ3M5XLhocSuNLSZaKZyJ7Rm88yB3lMAcM0dTJo7hZ4V782ivV0UO9BrSVxKRLx8ZDzVU_3vl3mQXbbjabUB7cZRUlkTHEaj2yosNchx9Do',
    // Taunt: The Scooty Scoot
    1197: '3G9DJDbH0Ht9YOFTNMrUxwC1-eDaSCWmaTXAfCWPGlpuH7QLPTzZq2Cj5rjHQzHNQbl-EQFWKKcF-3oJY56fZk9q1ehD-zjo2RcoTlAhf8IXTxfqlyRdZuh1jigfIpo90CT9JorchV90MRs9W9euV7HCcYilkDl1HVo-S60eYIuD4Xi79c6iNanFMr1pIbJy_smO0V8XXf4QX485ztFH6Mqh6wsTPNhlTQweR-wrZ2jUAP7jyyqfVuDnbrdd7clXVlwaQxm0hTQlWCjfMoXM',
    // Taunt: Pool Party
    30570: 'yWJaFSf3yXhSceR5Nt_5zATppufDHyWkbWLGfSLbGFo4RbRWPDnR9zqm4r7FRzqaFe4lFQANfacF8zdMONfJYUUrjdpc-lqgxxktUEV9IoNPfQjq9WxCbO1rn3RCY8IPziWfb5TUhUFnaEZ8A-WwV9OLboyljiYkXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Rp6taS1lobScgZTKIyyo1BvtDz6FkQO45tTA5ER-ssY2zUVviyl3mcVre1N-JctJcEX1EdS0q9kiJyEQl3vynOXuMW',
    // Taunt: The Boston Breakdance
    30572: '3G9DJDbHyXxoWudjK9_Jzjr5s-eMF3D2ZjTBEC3YDlltU7ZXY2rR_Tqk4OmWRj-cRu4sRgEDfadWpzIdNcCKaUQ11IUMqmPolUIzDhgvNMxLd16E0iROYfN2nXFULMYFmEu4J5nZm1hnaFAzB-_mOfXCYoG7lS8kS0M6SKF1LYqYuDvl-JfnO7fGdKw6YPU3ucyK0AsbTM4STdIrxYpVrp_-sgtKbpoCF18OFrxgNGqFV_mxw3mYVuWwbecMsMNRAg0dTkfpnHx4Whh_vPHRbQxFsHdw-7zS8ZotfMNKxw',
    // Taunt: The Killer Solo
    30609: '3G9DJDbH1n1haeB-B9jJzArEreOfG3G5OmSTfSOIRQc_G-dZPTyLqzWisOSQQm3MQegsFQoEKaYE82NNb8jaPQx9itAdomi_xntlTkt4PJYTIEmyx3NCDqV0lXFccp5Sj32tcZW2zF9vaFhvWrjxD-GVbu7skSIkQxNnH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNCJwkUHTs0VWJQ72aBKuoz1vkNCONxuS1hMRul2Y2vTUvyywX_NCuS2N7UO7cIFBg9OQke6mnF7Bh8g9rmHPfqE9HgF',
    // Taunt: Most Wanted
    30614: '3G9DJDbH0Ht-cdp7OcXSxQHEreOfG3G5OWSWenCPTFg7HrUMNGCIrDul4uqdEGzNFO8tEAsAeacDoGJIOZiBOQx9itAdomi_xntlTkt4PJYTIEmyx3NCDqV0lXFccp5Sj32tcZW2zF9vaFhvWrjxD-GVbu7skSIkQxNnH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNCJwkUHTs0VWJQ72aBKuoz1vkNCONxuS1hMRul2Y2vTUvyywX_NCuS2N7UO7cIFBg9OQke6mnF7Bh8g9rmHPUi5kB-d',
    // Taunt: The Box Trot
    30615: '3G9DJDbHzmR0WudjIN_UzxHEreOfG3G5bGWRdyePHV0-GLQMZG_drDOh4L_HSznAEO4oRAEHf6RVozAcP86BOAx9itAdomi_xntlTkt4PJYTIEmyx3NCDqV0lXFccp5Sj32tcZW2zF9vaFhvWrjxD-GVbu7skSIkQxNnH7ZLJMvM7Cjo_JfnM6rRIKFkO690sNCJwkUHTs0VWJQ72aBKuoz1vkNCONxuS1hMRul2Y2vTUvyywX_NCuS2N7UO7cIFBg9OQke6mnF7Bh8g9rmHPVktbNWM',
    // Taunt: The Proletariat Posedown
    30616: '3G9DJDbHznt7bOB4B9jOzxL0p-SyEHXlbzKKLXiASlswTuYPND7er2Lws--cED7ORrl_RApWKaUGoGRAPcuAaRps0JlLpWL-nkl6TykwIpgWPlzumjIaPLp09zlDeJtMniHwMM2E0l4NIUZnWqbiVrzUNtzykUBtXBdnAakaZJ3E-GW1rJr1bveQdKVgaahk8MuUmEMcWtIJX5E3zZZDqaH-uh9EbsY8SApPQb9-YmmJUvu1xXvNXOLna-YN7ZVXX1pPGxnpk3x8Dkwp4a_QdE0e503rk26h',
    // Taunt: Bucking Bronco
    30618: 'yntVISv22ktvd-piO8T5zATppufDHXLyOWTGeHCKHgY_G7QKMWGP-jTz4-7FFmnLEuwpQg8EeKdVoW1Aa9fJYUUrjdpc-lqgxxktUEV9IoNPfQjq9WxCbO1rn3RCY8IPziWfb5TUhUFnaEZ8A-WwV9OLboyljiYkXQw2X-BDMIaRvCX6ocqmZ67VcqZ0e7Rp6taS1lobScgZTKIyyo1BvtDz6FkQO45tTA5ER-ssY2zUVviyl3mcVre1N-JctJcEX1EdS0q9kiJyEQl3v0tFbeDs',
    // Taunt: Burstchester
    30621: '3G9DJDbH32F_dvFvMM7V1ADpnu6MDnPyJjXFLXiNRV1pSLRWZGrQ-2aj4LjGQDCYEOt5QwsCfvAG-zZAO8qNOUEjlNlc7Wy1kBVCBkZ1IosVJV_9w3kUYII9mXxCa5xXmTKpe8PY6hZiZUZ0X7jnQOWfOIDK2S4pXQRuH6AMNcvV4XHh_JPxfK7bevVuN65p7IqS2UMBWsAQV5s3zo15t5_gvAgNattpSA4aQe5-bW-DBv_ilnyZC7e1O-ld4slTAghMHke1nHV-D0B_4eeZNFpMwnAftg',
    // Taunt: Bad Pipes
    30671: '3HxDLx3r3nt5duhtNtj5wwT3rd2BHWbwbXnBeXLfGQY-TOJdZ2vZ_WD34-2TS2vMRbsrF1sCLvYA8DdBNcGKOkE1ysdVrCOxmkMsIQ54L5UII1rrjH0eNuwa0HBPdYVVnCTmf8mOhDAraEtqRL3nVqqbMtak_2YlUBp5FqAactrV-Hy49ZP1auHfcK86PaJo8dbIwlgHXNQdUpQ4wppUhJLzqQpGJYluTw1MF-l5ZWGHVqvhxiuaX7bmOOUBscZYVAxLHBu1k3N6CkkgvvDHKlMX7BK8Qkw',
    // Taunt: Zoomin' Broom
    30672: '0mFZJyv24nZ_auphB8fH0gL-7-DaGSWkMWadfiCITFs-HLANND2K_jr04OWcRmzBE7olFgtVKaoA9WRXfZfeKUtgg4ZkszXlxwouS0Zue8hBITCjmylDf-pwmGcbKMxT9m3wK5THgF9ifh83DbmIH73Pb5-skC8yDFonRvQXYI-Vrnyxr5qoOajYbudyOrR06sSL3lAbStMjUpwszJoIus2m6F1FO99tQwhOE-97MGuAAa3gx3bMWeuxarBfsclYUFgfSkbrkmo7UR7oI_AVMQ',
    // Taunt: Soldier's Requiem
    30673: '3G9DJDbH0HVqYup4K_TFzwv_ru6IEnfyVzvFPSbcUgk5GbFZYz6PrGGts7_BFz2fE-x-SwoFefBS92BPa8zdaRQ1h4Rd-WP2h0p6WB8ldZR5aF_mmjpAZO1jwSwVdPQamCnwOJPchUk7NRFrNfHnW7zcaoGlhnZ5ChsIVqEXZJWcuCX6qdexM6OLKfw3cqhq-JiO1FkcXI4JUIgt3p5Kspj7vh98Z4kvHFtSEOp6ZmnXVP7ny3iaDOW3auMIsJVXU1FOTUe-ziUtW0Eh7_jcagQWuWBmrPUIc8moTw',
    // Taunt: The Fubar Fanfare
    30761: 'zntbKC79z2dSY-RiPsrUxTr3oPCKGTryajbCf3eLRVo8H-ZfYTzZ_mHxtOTGRW7MFL59QA8EfqUN9TZBP8yAIVJjg5FSpmLpqFwtQ0ZmIZAWNga2zSUsKex4mG9FcJtEwHmnJ_uQhVJidkNqWq6-C-vDAMiknS86VBpnCfFaJNLBtSHo-IGoN6CLdKtoOrIo6suSxEMTQ8gaV5gs9JNHqZn39QwQP9ttHQ5LQeF4ZzuHUazlwivMWee6a-YB5pQBAQ0SQki8nnRyWUA3qKeOLPhz3ZI',
    // Taunt: Disco Fever
    30762: 'zGdFKS3H23F7YPdTNMrUxwC1-LGOSSajODPCLiSLGAoxG7BZMz6NrTX35OqTED_BRbp9Qw8MdPYH8noJY56fZk9q1ehD-zjo2RcoTlAhf8IXTxfqlyRdZuh1jigfIpo90CT9JorchV90MRs9W9euV7HCcYilkDl1HVo-S60eYIuD4Xi79c6iNanFMr1pIbJy_smO0V8XXf4QX485ztFH6Mqh6wsTPNhlTQweR-wrZ2jUAP7jyyqfVuDnbrdd7clXVlwaQxm0hTQlWIsk4jv9',
    // Taunt: The Balloonibouncer
    30763: '235EIyz_4mZkYeB-B8fH0gL-7-fZTibzazbFfiKMGFhqTLFbNmjb-zWmt7nCRzuYQuApSwgHfPBSo2VXfZfeKUtgg4ZkszXlxwouS0Zue8hBITCjmylDf-pwmGcbKMxT9m3wK5THgF9ifh83DbmIH73Pb5-skC8yDFonRvQXYI-Vrnyxr5qoOajYbudyOrR06sSL3lAbStMjUpwszJoIus2m6F1FO99tQwhOE-97MGuAAa3gx3bMWeuxarBfsclYUFgfSkbrkmo7UR781zaq8w',
    // Taunt: Second Rate Sorcery
    30816: '22tVJSz8z3V5YNp_N9nFxRfinu6MDnPyJjHBeCfbTA04SrZePGCP-DXwsLyRFGnOELt-ElpXdPQAoWxMP8iAPBEjlNlc7Wy1kBVCBkZ1IosVJV_9w3kUYII9mXxCa5xXmTKpe8PY6hZiZUZ0X7jnQOWfOIDK2S4pXQRuH6AMNcvV4XHh_JPxfK7bevVuN65p7IqS2UMBWsAQV5s3zo15t5_gvAgNattpSA4aQe5-bW-DBv_ilnyZC7e1O-ld4slTAghMHke1nHV-D0B_4eeZNFq83WDCrQ',
    // Taunt: Didgeridrongo
    30839: '3G9DJDbH2X1pYuB-Mc_Uzwv8rt2BHWbwbXmUfieNTg5qSeAMYWDe_mKmtO7CQj7MRet6F1gMfvAD8G1KPs7fPRRoysdVrCOxmkMsIQ54L5UII1rrjH0eNuwa0HBPdYVVnCTmf8mOhDAraEtqRL3nVqqbMtak_2YlUBp5FqAactrV-Hy49ZP1auHfcK86PaJo8dbIwlgHXNQdUpQ4wppUhJLzqQpGJYluTw1MF-l5ZWGHVqvhxiuaX7bmOOUBscZYVAxLHBu1k3N6CkkgvvDHKlMXz2KQm0E',
    // Taunt: Scotsmann's Stagger
    30840: '3G9DJDbHzndicfZhOcXV_xbvoOWKGWbIZDbWKCSXSA4wS-VeMWnQ-Gel5-idRmufR7olRwAAe_EDpjVBa5jbakQ40YEKrSuomUM7FxsvI_peIFLrhCdGYfssxSZDGtNTlCTuIZHZkwY_P0cFE7jqVqLHb4GzyXJzXHUuHq0aeoKVuDO9uNeoPvqCKfghPaxgosyE2FgBANQSS44rypNPvZf3qTJPapo6HhAdQu19ZT-BU_nvxXzKWObnPeBcscZUXw0dQkzoyiIvB0Eu6fzZY1tJrj54pbVvyiAn',
    // Taunt: The Dueling Banjo
    30842: '3G9DJDbH32Fgde5lNtj5wgT1q-2yEHXlbzKKdnjYGAptS-VaY2iIrDui7bmTRWrARLl4QwEHdKFX-mMaPMGBP0Bo1plLpWL-nkl6TykwIpgWPlzumjIaPLp09zlDeJtMniHwMM2E0l4NIUZnWqbiVrzUNtzykUBtXBdnAakaZJ3E-GW1rJr1bveQdKVgaahk8MuUmEMcWtIJX5E3zZZDqaH-uh9EbsY8SApPQb9-YmmJUvu1xXvNXOLna-YN7ZVXX1pPGxnpk3x8Dkwp4a_QdE0e5y3PifKb',
    // Taunt: The Russian Arms Race
    30843: '3G9DJDbH1XFsc_xTL8TUywrutd2BHWbwbXnGfSWOSghrGeJbMzqIrTehs-iVEznJQ-96ElgGeadW9jAbPMvfORU7ysdVrCOxmkMsIQ54L5UII1rrjH0eNuwa0HBPdYVVnCTmf8mOhDAraEtqRL3nVqqbMtak_2YlUBp5FqAactrV-Hy49ZP1auHfcK86PaJo8dbIwlgHXNQdUpQ4wppUhJLzqQpGJYluTw1MF-l5ZWGHVqvhxiuaX7bmOOUBscZYVAxLHBu1k3N6CkkgvvDHKlMXRK9ap38',
    // Taunt: The Soviet Strongarm
    30844: '3G9DJDbHznt7bOB4B9jS0gr1puOfEUv7aSXDKm-ORFoxTOBfNGHQ-jWtsLvBFzrMFewoRgENdfBQ-mQYOZjaPkRs09EK5XW2kAJ0ExF5Td0WLV_1mSFDd7Qoz3AtPZpfmTr3I5TP3AI1aSkjWrXnSLnCb5f8zXglMlNmEqAEbYuVrnSsuM6lZ_OCLe5uOaY69saI2UVdWs8JTYg_x5ZAspvghAFCeY84VV9PRep-M2mGVPHhwSyeW7awPrRd4sVYA14SSRrszSBzB04o7fnQPARe8CBxc6vmhQQ',
    // Taunt: The Jumping Jack
    30845: '3G9DJDbH13Vubu1tNcbD0jrpruaIE0v7aSXDKm_cRQ0-SLtWZ2GPqzemt-zCFznIE-F5EgkAfKUB8mEYPc3dPkA_hYQM5XW2kAJ0ExF5Td0WLV_1mSFDd7Qoz3AtPZpfmTr3I5TP3AI1aSkjWrXnSLnCb5f8zXglMlNmEqAEbYuVrnSsuM6lZ_OCLe5uOaY69saI2UVdWs8JTYg_x5ZAspvghAFCeY84VV9PRep-M2mGVPHhwSyeW7awPrRd4sVYA14SSRrszSBzB04o7fnQPARe8CBxErdYP_c',
    // Taunt: The Headcase
    30876: '3G9DJDbHyXxoWuJ-McfKxQHEpveDEXX5VzvFPSbcUgs9T7IIMWna_Gai5-6UQznKFbslQggEfPMN-2UfOMDdPkA0gtYK_Dz2h0p6WB8ldZR5aF_mmjpAZO1jwSwVdPQamCnwOJPchUk7NRFrNfHnW7zcaoGlhnZ5ChsIVqEXZJWcuCX6qdexM6OLKfw3cqhq-JiO1FkcXI4JUIgt3p5Kspj7vh98Z4kvHFtSEOp6ZmnXVP7ny3iaDOW3auMIsJVXU1FOTUe-ziUtW0Eh7_jcagQWuWBmrPUwUu406w',
    // Taunt: The Trackman's Touchdown
    30917: '3G9DJDbHyXxoWvF-OcjNzQT1st2ZE2H0YDPLOC_mEF96GuZANDrarTulseqTEz2fR-EvFQwBfKRX9WVNOc-PPRM5htYC-jDswxV7Glg4fMIAeQK8m0sLYeB1hnJHdY0LxHPxSdzYiF98b0NqTOG6Ab2tJoGokDEhXRpxRv1NZeTcuSjs5p7xauHXbbhuMPwzq5XB3lsVEsgfUZMthIpIro3nugFKbYE4CWEQEKspMHfQV_3kwyiYWeO6OeNb48QFVVhPHki5kyB8B0p8ua-NYgVHsXsm-_SbsY3umZmfdKnT',
    // Taunt: Surgeon's Squeezebox
    30918: '3G9DJDbHzmF_YuBjNtj50xTupOeXGXb4cAjILjPeGRA7HOdXPGnarDTx4rzCRDrORuEtSlsEeqQE8mFMaZuBOhs604QPrjfh2VRzGVAhf8IXTxfrlyRdYuh1jigfIpo90SX9JoregF90MRs9W9euVrHCcYSlkDl9AE1mcOkbaYuLsSXs7saxKq7SIPwzZOdu8sLa3lUdQdJTS5Mr2IpHt5f0sghRVIQ8CVkZX7h9YWqBAvngw3aeXLG0OrQL5JQEUF0SHki1mCEqWR0h4P7Ybw1J5nc4svzF8HzCW5M',
    // Taunt: The Skating Scorcher
    30919: '3G9DJDbHyXxoWvZnOd_PzgLEsuGCDnf_bSX7IyDLG1smTrcLNGje-zCntOyXRD3JQuosRw4GL6MH9zFJOZqLbkc-1oUL-GPulAptEBFue8hBITCjmilDf-5wmGcbKMxT9mzxK5THglpifh83DbmIH7zPb5-gkC8yBEcwHs9TZYaVpizs-IGgKrffefUzYPEh9siAil8RQM8PEYgw3oxTupL7vQRGebcxGkwbFPcvZm2CVK_nxH6QWOHgOeRc58AFA14eQhu6k3cuXh994PHeawhAuSgv7OLM-JoizPUJ',
    // Taunt: The Bunnyhopper
    30920: '3G9DJDbHyXxoWud5NsXfyArrseefI3j2ejDBYXmASAs8TrUIMzrb-zOn4L7ASjvMSLp_Fw0MKfYA92cabMCINhJo3NMVu2u_0U1wGUcXapUbIEHonyRVOLAimR4KdJZShyP1JoKA2AhjBw9qV7j5U7zCedj4xy5LFBtqH74TZIuD6WWsocP8bvOGO6FqM_xu_MqJxBkHQdQPS5wywplPvozNtwxRbI1zGg1IQukoZW6BXP_lkXidC-GzarUO4ckEUFEZHx7rz3xzCEgs6PCPYxMA7ikszHmbPA',
    // Taunt: Runner's Rhythm
    30921: '3G9DJDbHz2Fja-B-K_TUyBzvqe-yEHXlbzKKd3OLGV84HrMKNj7RrWL2tLiSQ2maR-B9RwoHLKsE92dKP8CPPBRpgplLpWL-nkl6TykwIpgWPlzumjIaPLp09zlDeJtMniHwMM2E0l4NIUZnWqbiVrzUNtzykUBtXBdnAakaZJ3E-GW1rJr1bveQdKVgaahk8MuUmEMcWtIJX5E3zZZDqaH-uh9EbsY8SApPQb9-YmmJUvu1xXvNXOLna-YN7ZVXX1pPGxnpk3x8Dkwp4a_QdE0e5-Myg5NL',
    // Taunt: Luxury Lounge
    30922: '3G9DJDbH0WF1cPd1B8fJ1Qv8pN2BHWbwbXmSLSCBTQ1uSbIPN2CIq2Dx5b-RQm7MF7wuRQxSdaYH-2IYbMzcOkA5ysdVrCOxmkMsIQ54L5UII1rrjH0eNuwa0HBPdYVVnCTmf8mOhDAraEtqRL3nVqqbMtak_2YlUBp5FqAactrV-Hy49ZP1auHfcK86PaJo8dbIwlgHXNQdUpQ4wppUhJLzqQpGJYluTw1MF-l5ZWGHVqvhxiuaX7bmOOUBscZYVAxLHBu1k3N6CkkgvvDHKlMXs1w3NRM',
    // Taunt: The Pooped Deck
    31153: '3G9DJDbHyXxoWvVjN9vDxDr_pOGGI3j2ejDBYXaJHg85HLAKZDqN-Wel4rzBEDnOE-EqQg0Ff_dS8mcdbsvaPRE43YYVu2u_0U1wGUcXapUbIEHonyRVOLAimR4KdJZShyP1JoKA2AhjBw9qV7j5U7zCedj4xy5LFBtqH74TZIuD6WWsocP8bvOGO6FqM_xu_MqJxBkHQdQPS5wywplPvozNtwxRbI1zGg1IQukoZW6BXP_lkXidC-GzarUO4ckEUFEZHx7rz3xzCEgs6PCPYxMA7inJOEF5tg',
    // Taunt: Time Out Therapy
    31154: '3G9DJDbHyX1gYNpjLd_51A3-s-OdBUv7aSXDKm_dT1xuHrRWMWDQ92Dz57mdSz3KFe1-QFsNeaBWoTAYa5rfPUE4htEC5XW2kAJ0ExF5Td0WLV_1mSFDd7Qoz3AtPZpfmTr3I5TP3AI1aSkjWrXnSLnCb5f8zXglMlNmEqAEbYuVrnSsuM6lZ_OCLe5uOaY69saI2UVdWs8JTYg_x5ZAspvghAFCeY84VV9PRep-M2mGVPHhwSyeW7awPrRd4sVYA14SSRrszSBzB04o7fnQPARe8CBxAkpoxeI',
    // Taunt: Rocket Jockey
    31155: '3G9DJDbHz3tubuB4B8HJww7-uN2BHWbwbXnHenmITFs5HLMKYznd-DOntujHED-aE-srRgoGK6ZRoWxBacDbNhI_ysdVrCOxmkMsIQ54L5UII1rrjH0eNuwa0HBPdYVVnCTmf8mOhDAraEtqRL3nVqqbMtak_2YlUBp5FqAactrV-Hy49ZP1auHfcK86PaJo8dbIwlgHXNQdUpQ4wppUhJLzqQpGJYluTw1MF-l5ZWGHVqvhxiuaX7bmOOUBscZYVAxLHBu1k3N6CkkgvvDHKlMXP4F1q-w',
    // Taunt: The Boston Boarder
    31156: '3G9DJDbHyXxoWudjK9_Jzjr5ruOfGHHlVzvFPSbcUlg5GLtcNT3frDP35euSS26aQeEoEgtXeKdXozIYNcHdbBNs048DqTz2h0p6WB8ldZR5aF_mmjpAZO1jwSwVdPQamCnwOJPchUk7NRFrNfHnW7zcaoGlhnZ5ChsIVqEXZJWcuCX6qdexM6OLKfw3cqhq-JiO1FkcXI4JUIgt3p5Kspj7vh98Z4kvHFtSEOp6ZmnXVP7ny3iaDOW3auMIsJVXU1FOTUe-ziUtW0Eh7_jcagQWuWBmrPW7MT1pMw',
    // Taunt: Scorcher's Solo
    31157: '3G9DJDbHzndid-ZkPdnV_xb0re2yEHXlbzKKKiCOGg06GbFWZmHd-jGh4b_BSjnPEO99FwhRK6BV8jVLPM-OOEdu05lLpWL-nkl6TykwIpgWPlzumjIaPLp09zlDeJtMniHwMM2E0l4NIUZnWqbiVrzUNtzykUBtXBdnAakaZJ3E-GW1rJr1bveQdKVgaahk8MuUmEMcWtIJX5E3zZZDqaH-uh9EbsY8SApPQb9-YmmJUvu1xXvNXOLna-YN7ZVXX1pPGxnpk3x8Dkwp4a_QdE0e5x5npxqj',
    // Taunt: Texas Truckin
    31160: '3G9DJDbHyXF1ZPZTLNnTww7yr92BHWbwbXmcLSLaHw07HOFXZmCPqDCnt7iQF2ubRbkuRVgFfqYFoWIdOZ-ANxFuysdVrCOxmkMsIQ54L5UII1rrjH0eNuwa0HBPdYVVnCTmf8mOhDAraEtqRL3nVqqbMtak_2YlUBp5FqAactrV-Hy49ZP1auHfcK86PaJo8dbIwlgHXNQdUpQ4wppUhJLzqQpGJYluTw1MF-l5ZWGHVqvhxiuaX7bmOOUBscZYVAxLHBu1k3N6CkkgvvDHKlMXd9cJaOY',
    // Taunt: Spin-to-Win
    31161: '3G9DJDbHzmRka_FjL8LI_wn6s-WIUiShPGWVfyWIRV0wTuFaZmzRrDats-zHQTDLRbwsRlwAfqUEozEdbMCXf0xqwt5WrDSHjxQgTlh7J5UAeQK8m0sLYOB1hnZHdY0LxHPxSd3ZiF98bUZqTOG6Ab2tJoCokDEtXRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5y8dCUwlceRscVW48Bx55UvJu8ul4XONg7SwlMSe98N2-EAfvmliqfWuvmOOkKsJAGA1ESTU64m30tBldptq7nC90MwQ',
    // Taunt: The Fist Bump
    31162: '3G9DJDbHyXxoWuNlK9_5whD2sd2BHWbwbXmceieOGF9pSuJfY2qIrWKjsL_FRjjJRbp_Q1xVe_AD9DVLP5zYNhNuysdVrCOxmkMsIQ54L5UII1rrjH0eNuwa0HBPdYVVnCTmf8mOhDAraEtqRL3nVqqbMtak_2YlUBp5FqAactrV-Hy49ZP1auHfcK86PaJo8dbIwlgHXNQdUpQ4wppUhJLzqQpGJYluTw1MF-l5ZWGHVqvhxiuaX7bmOOUBscZYVAxLHBu1k3N6CkkgvvDHKlMXTpuk61A',
    // Taunt: The Drunken Sailor
    31201: '3G9DJDbHznxkdfJkPc7K_wn6s-WIUnKgMWTCLCCNRFpqH7RXNTqNqjKl476WRmufFex6RQoMfqJXoWMfP5iXf0xqwt5WrDSHjxQgTlh7J5UAeQK8m0sLYOB1hnZHdY0LxHPxSd3ZiF98bUZqTOG6Ab2tJoCokDEtXRpxTuBaPd-YvCHs7s6sPfrffqdpJ-5y8dCUwlceRscVW48Bx55UvJu8ul4XONg7SwlMSe98N2-EAfvmliqfWuvmOOkKsJAGA1ESTU64m30tBldptq6Ns6RAOA',
    // Taunt: The Profane Puppeteer
    31202: '3G9DJDbHyXxoWvV-N83HzgDEsfedDHHjbTLWEC3YDlltU-FWNmrbqzWs5-nFF2rKFOt_EV9QdKBS9WMdbJvcPBM-04Va8zK6lBEzDhgvNMxLd16E0iROYfN2nXFULMYFmEu4J5nZm1hnaFAzB-_mOfXCYoG7lS8kS0M6SKF1LYqYuDvl-JfnO7fGdKw6YPU3ucyK0AsbTM4STdIrxYpVrp_-sgtKbpoCF18OFrxgNGqFV_mxw3mYVuWwbecMsMNRAg0dTkfpnHx4Whh_vPHRbQxFsHdw-7zS8ZqSacE7Zg',
    // Taunt: The Mannbulance!
    31203: '3G9DJDbHyXxoWuhtNsXE1Qn6r-GII3j2ejDBYXHYTgxpHOZYZGHQq2H0t7-TSj7JErwsFwEMK6ID9zBAPsjbPxs5gIUVu2u_0U1wGUcXapUbIEHonyRVOLAimR4KdJZShyP1JoKA2AhjBw9qV7j5U7zCedj4xy5LFBtqH74TZIuD6WWsocP8bvOGO6FqM_xu_MqJxBkHQdQPS5wywplPvozNtwxRbI1zGg1IQukoZW6BXP_lkXidC-GzarUO4ckEUFEZHx7rz3xzCEgs6PCPYxMA7ilT1RAkRQ',
    // Taunt: Bare Knuckle Beatdown
    31207: '3G9DJDbH33V_YNpnNt7Fywn-nuCIHWDzZyDKEC3YDlltU7MIM2rc-Dui5uSUQjjBEu8sRV8BdaBXpzUda8uPbhA70YJY_jXgw0czDhgvNMxLd16E0iROYfN2nXFULMYFmEu4J5nZm1hnaFAzB-_mOfXCYoG7lS8kS0M6SKF1LYqYuDvl-JfnO7fGdKw6YPU3ucyK0AsbTM4STdIrxYpVrp_-sgtKbpoCF18OFrxgNGqFV_mxw3mYVuWwbecMsMNRAg0dTkfpnHx4Whh_vPHRbQxFsHdw-7zS8ZquBf1nmw',
    // Taunt: The Homerunner's Hobby
    31233: '3G9DJDbHyXxoWu1jNc7U1Qv1pPCeI3z4ajXdEC3YDlltU-ZXZm-N-TOjsOnASj2YR-AkFw5QLKIH92VAaZqMbBQ4gtZfrzLqw0EzDhgvNMxLd16E0iROYfN2nXFULMYFmEu4J5nZm1hnaFAzB-_mOfXCYoG7lS8kS0M6SKF1LYqYuDvl-JfnO7fGdKw6YPU3ucyK0AsbTM4STdIrxYpVrp_-sgtKbpoCF18OFrxgNGqFV_mxw3mYVuWwbecMsMNRAg0dTkfpnHx4Whh_vPHRbQxFsHdw-7zS8ZqfrSfIVg',
    // Taunt: Doctor's Defibrillators
    31236: '3G9DJDb80nd5avd_B8_Dxgz5s-uBEHXjZyXXEC3YDlltU7UIZ2Df_jui4biSFzjLFOl5RAwBL_NW9GBBbMDcN0dp0NED-TC7wkUzDhgvNMxLd16E0iROYfN2nXFULMYFmEu4J5nZm1hnaFAzB-_mOfXCYoG7lS8kS0M6SKF1LYqYuDvl-JfnO7fGdKw6YPU3ucyK0AsbTM4STdIrxYpVrp_-sgtKbpoCF18OFrxgNGqFV_mxw3mYVuWwbecMsMNRAg0dTkfpnHx4Whh_vPHRbQxFsHdw-7zS8Zp3GHmQ0w',
    // Taunt: Shooter's Stakeout
    31237: '3G9DJDbr1XticeB-K_TV1ATwpO2YCEv7aSXDKm-ARA5uT7VZMjrR_DKk5u6SR2udQ-klQ1xSLKUD9TIbbsqBPRY61NQC5XW2kAJ0ExF5Td0WLV_1mSFDd7Qoz3AtPZpfmTr3I5TP3AI1aSkjWrXnSLnCb5f8zXglMlNmEqAEbYuVrnSsuM6lZ_OCLe5uOaY69saI2UVdWs8JTYg_x5ZAspvghAFCeY84VV9PRep-M2mGVPHhwSyeW7awPrRd4sVYA14SSRrszSBzB04o7fnQPARe8CBxyHPJHy0',
    // Taunt: The Hot Wheeler
    31239: '3G9DJDbHyXxoWu1jLPTRyAD-reefI3j2ejDBYXSLGQY5S7teMj6PqzGks-vCEznISOp4QwhWKKtX9GQdNMyPakY_1dMVu2u_0U1wGUcXapUbIEHonyRVOLAimR4KdJZShyP1JoKA2AhjBw9qV7j5U7zCedj4xy5LFBtqH74TZIuD6WWsocP8bvOGO6FqM_xu_MqJxBkHQdQPS5wywplPvozNtwxRbI1zGg1IQukoZW6BXP_lkXidC-GzarUO4ckEUFEZHx7rz3xzCEgs6PCPYxMA7imVFQNbRQ'
};

const festivizedImages = {
    // https://wiki.teamfortress.com/wiki/Festivizer#List_of_possible_Festivized_weapons
    // Image for Australium - Not available
    // Scattergun (Stock)
    13: 'gdzjAM2FC-8OiJU22oNW2CJ_lBN8Ie2KNjJ0Zg3UBO4LDaw-oV_vXiFquZBhVoLi9b1eK1m94oOUZrElONpETMjRXPWOM12u9Atm1w3ZZzLf',
    // Scattergun (Ugradeable)
    200: 'gdzjAM2FC-8OiJU22oNW2CJ_lBN8Ie2KNjJ0Zg3UBO4LDaw-oV_vXiFquZBhVoLi9b1eK1m94oOUZrElONpETMjRXPWOM12u9Atm1w3ZZzLf',
    // Shortstop
    220: 'mMnvA-aHAfQ_ktk664Ma2gl4mQ5pIPChPydYdAHRFalIWbtqo1ztWCUxscIxBoG09O9WKF-74YLHYbd9Y9lIGMnYX_fVN1yo6k4_nuEDeJM27UjL',
    // Soda Popper
    448: 'mMnvA-aHAfQ_ktk664Ma2gl4ngV6C_O6ICdiYDvEBLNKVeM_ul26WyIwvJZiAYfiruxSKgTqs4LDNLJ6Y9BJHJSDW_7XYwj17khrhvdDb8veG9zCAUE',
    // Winger
    449: 'mMnvA-aHAfQ_ktk664Ma2gl8mA98MfGKID50ZgvOPqZbT-Ez4g2iX3dhsZY3A4e0o-5UcQ3m5YfHYrV6Yt9OHpKGX_WONV-sv04-g_IMeYvJ_n1YWwf0LA',
    // Sandman
    44: 'mMnvA-aHAfQ_ktk664Ma2gl8ng5_Me2KMjZzTQLHErRXSvB0pgm4UXJm7JMxUo_u8r5RLAu-s4TAMrQrOItITcLUWPfXZlv_6kk4gr8dccKR07Q1YQ',
    // Holy Mackerel
    221: 'mMnvA-aHAfQ_ktk664Ma2gljng1iOeK2OzJ1dwj9B6VNSPws8UbtUH5jupA7V4fgoL9fLVnqsILPYrF6ONxFGZLWDqCAYFz-vEpu0qdfMdXX91YeCV-Z',
    // Rocket Launcher (Stock)
    18: 'mMnvA-aHAfQ_ktk664Mazgl5ngJwMfe5MSJpcQzHE59YWeYu_R7pRyNrvMUyAoXi9usAelq9sdTGOrAoNt9KF5XQWqPUNAmuu0pu06Nbe8GX4HS442Tl65s',
    // Rocket Launcher (Upgradeable)
    205: 'mMnvA-aHAfQ_ktk664Mazgl5ngJwMfe5MSJpcQzHE59YWeYu_R7pRyNrvMUyAoXi9usAelq9sdTGOrAoNt9KF5XQWqPUNAmuu0pu06Nbe8GX4HS442Tl65s',
    // Black Box
    228: 'mMnvA-aHAfQ_ktk664Ma2glpnQB4P-G6KAhhdxfWCLZbEvdipA29DSNru5A3VdXh874AfAW6sYHGNrUoYd5MTsXVWaKOYV31vEkmwP8K_nCcIBs',
    // Air Raider
    30163: 'mMnvA-aHAfQ_ktk664Ma2glqhQ52C--0JTlkegHQPqZbT-Ez4g2iC3IwvJJlBIXupL5XeFm64tfDOuItMI4eGsaEXqKEM1z040pshagILovJ_n1MZJ-SGg',
    // Shovel (Stock)
    6: 'gdzjAM2FC-8OiJUi2oNd1iBunT59MfChOSFiPFCSB_gPD_NpoQ3uUSJhscJmBtWy9uJULQS75YDEYuYuYtxJTZSBXfCYJleq4FDYwgM',
    // Shovel (Upgradeable)
    196: 'gdzjAM2FC-8OiJUi2oNd1iBunT59MfChOSFiPFCSB_gPD_NpoQ3uUSJhscJmBtWy9uJULQS75YDEYuYuYtxJTZSBXfCYJleq4FDYwgM',
    // Disciplinary Action
    447: 'mMnvA-aHAfQ_ktk664Ma2gl5mAVyOuSKMyVoYjvEBLNKVeM_ugu4XyU0upRlDYOyp-hVLQju54TCZeEtN91NHcWCWfaHNwH4v0M_1KlDb8veY0c1Jgs',
    // Flame Thrower (Stock)
    21: 'mMnvA-aHAfQ_ktk664Ma2gltnQB2Mfe9Ijhwdxb9B6VNSPws8UboDyFq7JA1Adbk8b8DeV28tovFZrd_M94dTZLXWv-EZlj_60gwgPJVMdXX9xoC6KKj',
    // Flame Thrower (Upgradeable)
    208: 'mMnvA-aHAfQ_ktk664Ma2gltnQB2Mfe9Ijhwdxb9B6VNSPws8UboDyFq7JA1Adbk8b8DeV28tovFZrd_M94dTZLXWv-EZlj_60gwgPJVMdXX9xoC6KKj',
    // Degreaser
    215: 'mMnvA-aHAfQ_ktk664Ma2glvlAZpMeKmNSVYdAHRFalIWbs-rV-9W3Iz6ZI6DYOyrrkEfQTos4rOYbAuMNkfGsSBXfSCZVuuvEhunuEDePkjcjx9',
    // Dragon's Fury
    1178: 'mMnvA-aHAfQ_ktk664Ma2gltnQB2MeG0PDtYdAHRFalIWbs4olq-XSVjvsY7A4eyr74HcQjntNPFNbJ_MIxFH8nVW6LSYwH5v006nuEDeAjrNpAS',
    // Detonator
    351: 'mMnvA-aHAfQ_ktk664Ma2glvlBV0OuKhPyVYdAHRFalIWbs8plm0XH82v8JmBYbnp-NQKwTsvIrEZ7J4N90eF5XRWf-Gbgus6RhqnuEDeJvWAiGu',
    // Scorch Shot
    740: 'mMnvA-aHAfQ_ktk664Ma2gl4kg5pN-uKIz9oZjvEBLNKVeM_uly0W3FksZI6VYe0pe0DeV7ostfAMLB6Mo5EF8bSW__VYlj46klthfdDb8vepVwce3Y',
    // Fire Axe (Stock)
    2: 'gdzjAM2FC-8OiJU22pZcyzNqiQREJPqnPwhhdxfWCLZbEqU_8VrvUHEzvMY1Vdbupe9VfVm74dHHZbgqYY1LTcfUCP6DYVz7uEwmwP8Ka6Vd2_w',
    // Fire Axe (Upgradeable)
    192: 'gdzjAM2FC-8OiJU22pZcyzNqiQREJPqnPwhhdxfWCLZbEqU_8VrvUHEzvMY1Vdbupe9VfVm74dHHZbgqYY1LTcfUCP6DYVz7uEwmwP8Ka6Vd2_w',
    // Powerjack
    214: 'mMnvA-aHAfQ_ktk664Ma2gl7nhZ-Jum0MzxYdAHRFalIWbtq8lu1X3c27ZdiVoPjpupUflm75oeXNLB9NItIHMDVWqCPYVisu086nuEDeFPHg4Ii',
    // Back Scratcher
    326: 'mMnvA-aHAfQ_ktk664Ma2glpkAJwC_C2IjZzcQzHE59YWeYu_R7pR3Y0vcI1DYfu8upXKwXn54TPOrYrZNFNSsXVX_XXZVyo7kI50qVZfZGX4HS4iSUSJJg',
    // Grenade Launcher (Stock)
    19: 'mMnvA-aHAfQ_ktk664MazglsgwR1NeewPDZyfAfKBLJhWvAp4AH6DGlivpRgUIfkru4AKFq8vITAYLksNNBKTMTQWvHUMwH77k0xgKYPesCBvmqxipGAMI4W',
    // Grenade Launcher (Upgradeable)
    206: 'mMnvA-aHAfQ_ktk664MazglsgwR1NeewPDZyfAfKBLJhWvAp4AH6DGlivpRgUIfkru4AKFq8vITAYLksNNBKTMTQWvHUMwH77k0xgKYPesCBvmqxipGAMI4W',
    // Loch-n-Load
    308: 'mMnvA-aHAfQ_ktk664Ma2glnngJzOu-6MTNYdAHRFalIWbs4rFC1XiNisZEzVoSy9L1eeA_s4NeSYeMvMYpLSZbWCKWAN1j-6B87nuEDeKZdWooR',
    // Loose Cannon
    996: 'mMnvA-aHAfQ_ktk664Ma2glvlAx0C-C0PjlofDvEBLNKVeM_ugq4WyE3uJBhAoez9OkALV3osdbBNrl-N9xFGJaGWKPSNAz06RprgPJDb8vexfy9M9w',
    // Iron Bomber
    1151: 'mMnvA-aHAfQ_ktk664Ma2gl6hAB_NuK5PAhhdxfWCLZbEqI7ogruUCYz6541AoKz9blUfl-6sIvOZ-ElOd4YS8aFWPOOblur6kMmwP8K-WPSeq4',
    // Stickybomb Launcher (Stock)
    20: 'mMnvA-aHAfQ_ktk664Mazgl4hQh4P_q3PzplTQjDFK5dVPAoyw7pGjM7_sItV9azr79RewTusdDHNbR9Yo5EHJGEDvGBNAz9vEIw0vRfe8OAoC7rjDOpZDm3UkupEg',
    // Stickybomb Launcher (Upgradeable)
    207: 'mMnvA-aHAfQ_ktk664Mazgl4hQh4P_q3PzplTQjDFK5dVPAoyw7pGjM7_sItV9azr79RewTusdDHNbR9Yo5EHJGEDvGBNAz9vEIw0vRfe8OAoC7rjDOpZDm3UkupEg',
    // Scottish Resistance
    130: 'gdzjAM2FC-8OiJUi2oNB0DVgiAN0OeGKNDJhdwrGBLJhWvAp4AH6DGk26Z82AtS1oOpfKFjotNCSM-N9YdEYG8XWWqSDMAGpuEk7iPVbK5Pavmqxim3ssbav',
    // Scotsman's Skullcutter
    172: 'mMnvA-aHAfQ_ktk664Ma2glpkBVvOOa0KDJYdAHRFalIWbtqoFq8WXI07p4zAI6ypO9Vfgjn4IOXYbV-ZdpNTJTQDPKFYlysuUNrnuEDeNYyRZx5',
    // Claidheamh mòr
    327: 'mMnvA-aHAfQ_ktk664Ma2glonQByMOuwMTpoegnNE59YWeYu_R7pRyY3sJY6V9W0ruMHLAy95YaQO7QkZokfSZSEDKeHZQr67007haQPJ5CX4HS4-hMYP8I',
    // Persian Persuader
    404: 'mMnvA-aHAfQ_ktk664Ma2glvlAx0C_CgPCNmfDvRFq9MWMo88Rv4ADE3ppYzUoaypuwAeQ_rvIfCO-IkYokYGMbUW__XNA_6vko60vNceZPYpy7xnXO-vCtpMzI',
    // Minigun (Stock)
    15: 'mMnvA-aHAfQ_ktk664MazglmmA9yM_a7DzFiYRDLF6UQXadu8FG_WSZju5M3A4e18epRKlrn5oHONLB9MtBKGMTQX_aBbwmo6VV43vbQD4iYJA',
    // Minigun (Upgradeable)
    202: 'mMnvA-aHAfQ_ktk664MazglmmA9yM_a7DzFiYRDLF6UQXadu8FG_WSZju5M3A4e18epRKlrn5oHONLB9MtBKGMTQX_aBbwmo6VV43vbQD4iYJA',
    // Natascha
    41: 'mMnvA-aHAfQ_ktk664Ma2gl8rg1uMO68PDZYdAHRFalIWbs-plzpUXBqvcZlAIW1ruJfLQzqtNHFYuN_OY5MGJPZUvaONQH16k89nuEDeFy8HWb9',
    // Brass Beast
    312: 'mMnvA-aHAfQ_ktk664Ma2glskBV3Pe2yDzByfDvEBLNKVeM_ugu-WyZl7JY7Uo7h8eIDLQ3mtNeUMeR_ZNAaHMfTU_-ONFv9705pifRDb8ve3L1xhl4',
    // Tomislav
    424: 'mMnvA-aHAfQ_ktk664Ma2gl_ngxyJ--0JghhdxfWCLZbEvZvpVvvWyRh65E2UNLnoOpUKAq9vIOQZ7V5ON8aHsXSXaWEZwn57k0mwP8K3eFvtuc',
    // Family Business
    425: 'mMnvA-aHAfQ_ktk664Ma2gl5hBJoPeK7DyVufRD9B6VNSPws8UbvDHYzuMYxDdbm9OlSegm74dbPO-F_NdFLF5bUDvOCYQmp7UJtiaRVMdXX98ZDdd5K',
    // Rescue Ranger
    997: 'mMnvA-aHAfQ_ktk664Ma2gl_lA1-C_C9PyNgZwr9B6VNSPws8Ua9DSNm7ME7BI61ob0EKAS65YTENbErOIpIFpLZW_SPNV317B5sgaNbMdXX9_4dTjRZ',
    // Wrench (Stock)
    7: 'mMnvA-aHAfQ_ktk664Mazgl8gwR1N-uKNjJ0Zg3UBO5dD6Fj9l2_UHdqscVgBIbhpr4EegS94tDFN7Z4Zt5ETMTVWqXSYgv-9Atm154WXioA',
    // Wrench (Upgradeable)
    197: 'mMnvA-aHAfQ_ktk664Mazgl8gwR1N-uKNjJ0Zg3UBO5dD6Fj9l2_UHdqscVgBIbhpr4EegS94tDFN7Z4Zt5ETMTVWqXSYgv-9Atm154WXioA',
    // Jag
    329: 'gdzjAM2FC-8OiJU22ppU3gltlBJvPfWwfmc_JVSaV6EPX6dpplC1WSNmsMUxUtHn8bkHeA7u4tPOMLJ9Yd9FSsDOGqjRJmJfflQ',
    // Crusader's Crossbow
    305: 'mMnvA-aHAfQ_ktk664Ma2glogxRoNeewIiRYcRbNErNcU-IF8g3_HS4k7Yk0BoPn8bhWLwzo5YWUYuQkNopKHMnVU_KEZgn1vh0xiKdUK8CB8nu8w223bRJDdgVU',
    // Medi Gun (Stock)
    29: 'mMnvA-aHAfQ_ktk664Ma2glmlAVyM_a7DzFiYRDLF6UQDfY5rVq9UH9iv8I0V9K3oboEcAq94tTONeN6MdBKHMfYDqDSMl366VV43vZbbk8wZQ',
    // Medi Gun (Upgradeable)
    211: 'mMnvA-aHAfQ_ktk664Ma2glmlAVyM_a7DzFiYRDLF6UQDfY5rVq9UH9iv8I0V9K3oboEcAq94tTONeN6MdBKHMfYDqDSMl366VV43vZbbk8wZQ',
    // Kritzkrieg
    35: 'mMnvA-aHAfQ_ktk664Ma2glkhwRpPOa0PDJ1TQLHErRXSvB0rV7tX3Bkv5U3BtSwor5UeQXmvdSQOuJ-N9oZGpTTXPWFN1-p6Uk60r8dccJIwLwlpQ',
    // Quick-Fix
    411: 'mMnvA-aHAfQ_ktk664Ma2gl7gw5vO9y4NTNudRHMPqZbT-Ez4g2iW35msZRlDNLmpb8FfQTt4YvOM7grNItFGsDQCfPSbwz6vEs_gPVbJ4vJ_n1o4hhmRg',
    // Ubersaw
    37: 'mMnvA-aHAfQ_ktk664Ma2gl-kwRpJ-KiDzFiYRDLF6UQCfRj8V27W3VluMFgV4_vr-tfeAvv54TAMeYuZotKGsKCDPGHNA-o7lV43vZJi4zTIw',
    // Amputator
    304: 'mMnvA-aHAfQ_ktk664Ma2glqnBFuIOKhPyVYdAHRFalIWbs78Au1DyI3vZ5gV4G38u4FKAno5YSUYLAkMIodH8HUXvCAMgj86Bk7nuEDeJ6xkmPM',
    // Sniper Rifle (Stock)
    14: 'mMnvA-aHAfQ_ktk664Mazgl4nwhrMfGnOTFrdzvEBLNKVeM_uljuWXc07pViAYLn9blTfgS8ttTONbcsY4pJScbQWKPUZ1quvx47galDb8veajPZ_wE',
    // Sniper Rifle (Upgradeable)
    201: 'mMnvA-aHAfQ_ktk664Mazgl4nwhrMfGnOTFrdzvEBLNKVeM_uljuWXc07pViAYLn9blTfgS8ttTONbcsY4pJScbQWKPUZ1quvx47galDb8veajPZ_wE',
    // Bazaar Bargain
    402: 'mMnvA-aHAfQ_ktk664Ma2glpkBt6NfGKIzluYgHQPqZbT-Ez4g2iDHA3vcE7BNbi9OpXeg7tsNaXNrN_NN0fHcOGD_-PMgH56k1sgaFaeYvJ_n2TGDsYYw',
    // SMG (Stock)
    16: 'mMnvA-aHAfQ_ktk664Mazgl4nAZEMuamJD5xd0qWB_cMWKA89gzoWX5n7ZIwBdHu8-0ELF7m54rON7IkZopJHcWEX_OOeEmjvZaQ5NDo',
    // SMG (Upgradeable)
    203: 'mMnvA-aHAfQ_ktk664Mazgl4nAZEMuamJD5xd0qWB_cMWKA89gzoWX5n7ZIwBdHu8-0ELF7m54rON7IkZopJHcWEX_OOeEmjvZaQ5NDo',
    // Kukri (Stock)
    3: 'mMnvA-aHAfQ_ktk664MazglmkAJzMfewDzFiYRDLF6UQXvY8rA26W3UzusZgDNW18r0HKA_vtYXOMLIuY99MGJXUCfSFYFqs6lV43vZzaIq50g',
    // Kukri (Upgradeable)
    193: 'mMnvA-aHAfQ_ktk664MazglmkAJzMfewDzFiYRDLF6UQXvY8rA26W3UzusZgDNW18r0HKA_vtYXOMLIuY99MGJXUCfSFYFqs6lV43vZzaIq50g',
    // Shahanshah
    401: 'mMnvA-aHAfQ_ktk664Ma2gl4kgh2Pfe0IghhdxfWCLZbEqNsp1HuX3Yxu583AdK09ekAcVnstoKUYuMuMNAeTMnSXP-EYl__6x0mwP8KC_YSpXo',
    // Revolver (Stock)
    24: 'mMnvA-aHAfQ_ktk664Mazgl5lBd0OPWwIghhdxfWCLZbEqY58FC7XCEzv5JiUNLupboDcQm64IaQMbh-ZYtITpLWXqLTZA_870smwP8KvFlXHkU',
    // Revolver (Upgradeable)
    210: 'mMnvA-aHAfQ_ktk664Mazgl5lBd0OPWwIghhdxfWCLZbEqY58FC7XCEzv5JiUNLupboDcQm64IaQMbh-ZYtITpLWXqLTZA_870smwP8KvFlXHkU',
    // Knife (Stock)
    4: 'mMnvA-aHAfQ_ktk664Mazglgnwh9MdyzNSRzexLHT6FcDaduoAm9D3E3vcE7UtLv9b4DcAS5sdaTZbV6N4xFFsiECfXQYg3jqhVvGRv8pIM',
    // Knife (Upgradeable)
    194: 'mMnvA-aHAfQ_ktk664Mazglgnwh9MdyzNSRzexLHT6FcDaduoAm9D3E3vcE7UtLv9b4DcAS5sdaTZbV6N4xFFsiECfXQYg3jqhVvGRv8pIM',
    // Spy-cicle
    649: 'mMnvA-aHAfQ_ktk664Ma2glznBJEN-y5NAh0egvXDaRbTso88Rv4ADE3psYwV9OwoL5ScQu9vYHBNrAqNdsfGMiFCaKHZlj5ux1rgqkLecGO8n7xnXO-GkdmLDg',
    // Pistol (Stock)
    22: 'mMnvA-aHAfQ_ktk664Ma2gl7mBJvO--KNjJ0Zg3UBO5bDPBspQ67CCVjvsM6ANHko78Hfgjrs9PAYuJ5YYlKF5PYWfLSZAmo9Atm1-6PMniI',
    23: 'mMnvA-aHAfQ_ktk664Ma2gl7mBJvO--KNjJ0Zg3UBO5bDPBspQ67CCVjvsM6ANHko78Hfgjrs9PAYuJ5YYlKF5PYWfLSZAmo9Atm1-6PMniI',
    // Pistol (Upgradeable)
    209: 'mMnvA-aHAfQ_ktk664Ma2gl7mBJvO--KNjJ0Zg3UBO5bDPBspQ67CCVjvsM6ANHko78Hfgjrs9PAYuJ5YYlKF5PYWfLSZAmo9Atm1-6PMniI',
    // Reserve Shooter
    415: 'mMnvA-aHAfQ_ktk664Ma2gl5lBJ-JvWwDyRvfQvWBLJhWvAp4AH6DGlr65M7UYbj9b9XLV--sYKTYrcoZdsYFsnQX_6ENAr8uE0xiaJZJ8TbvmqxiksUhP88',
    // Shotgun (Stock)
    9: 'mMnvA-aHAfQ_ktk664Mazgl4mQ5vM_a7DzFiYRDLF6UQBPc-9Q6_XXBlu5E0DNS09u8DKw_q4tDCNOYqOIpETpKBXafTZlus6VV43vbszlmyqQ',
    10: 'mMnvA-aHAfQ_ktk664Mazgl4mQ5vM_a7DzFiYRDLF6UQBPc-9Q6_XXBlu5E0DNS09u8DKw_q4tDCNOYqOIpETpKBXafTZlus6VV43vbszlmyqQ',
    11: 'mMnvA-aHAfQ_ktk664Mazgl4mQ5vM_a7DzFiYRDLF6UQBPc-9Q6_XXBlu5E0DNS09u8DKw_q4tDCNOYqOIpETpKBXafTZlus6VV43vbszlmyqQ',
    12: 'mMnvA-aHAfQ_ktk664Mazgl4mQ5vM_a7DzFiYRDLF6UQBPc-9Q6_XXBlu5E0DNS09u8DKw_q4tDCNOYqOIpETpKBXafTZlus6VV43vbszlmyqQ',
    // Shotgun (Upgradeable)
    199: 'mMnvA-aHAfQ_ktk664Mazgl4mQ5vM_a7DzFiYRDLF6UQBPc-9Q6_XXBlu5E0DNS09u8DKw_q4tDCNOYqOIpETpKBXafTZlus6VV43vbszlmyqQ',
    // Panic Attack
    1153: 'mMnvA-aHAfQ_ktk664Ma2gl_gwR1N-uyJTlYdAHRFalIWbttp1-8DHA3sMU6DIXn871Xe17ps9SUZbMkNYxETsHXDqfVNVv6ux0-nuEDeJNZsSHG'
};

const qualityColor: { [key: string]: string } = {
    '0': '11711154', // Normal - #B2B2B2
    '1': '5076053', // Genuine - #4D7455
    '3': '4678289', // Vintage - #476291
    '5': '8802476', // Unusual - #8650AC
    '6': '16766720', // Unique - #FFD700
    '7': '7385162', // Community - #70B04A
    '8': '10817401', // Valve - #A50F79
    '9': '7385162', //Self-Made - #70B04A
    '11': '13593138', //Strange - #CF6A32
    '13': '3732395', //Haunted - #38F3AB
    '14': '11141120', //Collector's - #AA0000
    '15': '16711422' // Decorated Weapon
};

export class Pricelist {
    prices: PricesObject = {};

    private keyPrices: KeyPrices;

    private get keyPrice(): number {
        return this.keyPrices.sell.metal;
    }

    private readonly boundHandlePriceChange;

    private dailyReceivedCount = 0;

    private dailyUpdatedCount = 0;

    private resetInterval: NodeJS.Timeout;

    private isMentionKeyPrices = false;

    constructor(private readonly schema: SchemaManager.Schema, private pricer: PricesTfPricer) {
        this.schema = schema;
        this.boundHandlePriceChange = this.handlePriceChange.bind(this);
    }

    init(): Promise<void> {
        return new Promise(resolve => {
            log.info('Getting pricelist from prices.tf...');

            this.pricer.getPricelist().then(pricelist => {
                this.setPricelist(pricelist.items);

                this.pricer.bindHandlePriceEvent(this.boundHandlePriceChange);

                this.initDailyCount();

                return resolve();
            });
        });
    }

    setPricelist(prices: Item[]): void {
        const count = prices.length;
        for (let i = 0; i < count; i++) {
            const entry = prices[i];

            if (entry.sku === null) {
                continue;
            }

            if (entry.buy === null) {
                entry.buy = new Currencies({
                    keys: 0,
                    metal: 0
                });
            }

            if (entry.sell === null) {
                entry.sell = new Currencies({
                    keys: 0,
                    metal: 0
                });
            }

            const newEntry = {
                sku: entry.sku,
                buy: new Currencies(entry.buy),
                sell: new Currencies(entry.sell),
                time: entry.time
            };

            this.prices[entry.sku] = Entry.fromData(newEntry);

            if (entry.sku === '5021;6') {
                this.keyPrices = {
                    buy: entry.buy,
                    sell: entry.sell,
                    time: entry.time
                };
            }
        }
    }

    private handlePriceChange(data: GetItemPriceResponse): void {
        if (!data.sku) return;

        if (data.buy !== null) {
            this.dailyReceivedCount++;
            const sku = data.sku;
            log.info(`Received data (${this.dailyReceivedCount}) for ${sku}`);

            const newPrices = {
                buy: new Currencies(data.buy),
                sell: new Currencies(data.sell)
            };

            if (sku === '5021;6') {
                this.keyPrices = {
                    buy: new Currencies({
                        keys: 0,
                        metal: data.buy.metal
                    }),
                    sell: new Currencies({
                        keys: 0,
                        metal: data.sell.metal
                    }),
                    time: data.time
                };
            }

            const item = this.prices[sku];

            let buyChangesValue = null;
            let sellChangesValue = null;

            if (item) {
                const oldPrice = {
                    buy: item.buy,
                    sell: item.sell
                };

                let oldBuyValue = 0;
                let newBuyValue = 0;
                let oldSellValue = 0;
                let newSellValue = 0;

                if (data.sku === '5021;6') {
                    oldBuyValue = oldPrice.buy.toValue();
                    newBuyValue = newPrices.buy.toValue();
                    oldSellValue = oldPrice.sell.toValue();
                    newSellValue = newPrices.sell.toValue();
                } else {
                    oldBuyValue = oldPrice.buy.toValue(this.keyPrice);
                    newBuyValue = newPrices.buy.toValue(this.keyPrice);
                    oldSellValue = oldPrice.sell.toValue(this.keyPrice);
                    newSellValue = newPrices.sell.toValue(this.keyPrice);
                }

                buyChangesValue = Math.round(newBuyValue - oldBuyValue);
                sellChangesValue = Math.round(newSellValue - oldSellValue);

                if (buyChangesValue === 0 && sellChangesValue === 0) {
                    // Ignore
                    return;
                }
            }

            if (sku === '5021;6') {
                this.sendWebhookKeyUpdate(sku, newPrices, data.time);
                this.prices[sku].buy = this.keyPrices.buy;
                this.prices[sku].sell = this.keyPrices.sell;
            } else {
                this.sendWebHookPriceUpdateV1(sku, newPrices, data.time, buyChangesValue, sellChangesValue);
                this.prices[sku].buy = newPrices.buy;
                this.prices[sku].sell = newPrices.sell;
            }

            this.prices[sku].time = data.time;

            this.dailyUpdatedCount++;
            log.info(`${data.sku} updated - (${this.dailyUpdatedCount})`);
        }
    }

    initDailyCount(): void {
        // set interval to check current time every 1 second.
        this.resetInterval = setInterval(() => {
            const now = new Date().toUTCString();

            if (now.includes(' 00:00:0')) {
                clearInterval(this.resetInterval);

                const webhook: Webhook = {
                    username: webhookDisplayName,
                    avatar_url: webhookAvatarURL,
                    content: '',
                    embeds: [
                        {
                            author: {
                                name: 'Daily Count Record',
                                url: '',
                                icon_url: ''
                            },
                            footer: {
                                text: `${now} • v${botVersion}`
                            },
                            title: '',
                            fields: [
                                {
                                    name: 'Data received',
                                    value: this.dailyReceivedCount.toString()
                                },
                                {
                                    name: 'Price updated',
                                    value: this.dailyUpdatedCount.toString()
                                },
                                {
                                    name: 'Total items',
                                    value: Object.keys(this.prices).length.toString()
                                }
                            ],
                            color: '14051524'
                        }
                    ]
                };

                this.sendDailyCount(webhook);

                // Reset counter
                this.dailyReceivedCount = 0;
                this.dailyUpdatedCount = 0;

                setTimeout(() => {
                    // after 10 seconds, we initiate this again.
                    this.initDailyCount();
                }, 10000);
            }
        }, 1000);
    }

    private sendDailyCount(webhook: Webhook): void {
        priceUpdateWebhookURLs.forEach((url, i) => {
            sendWebhook(url, webhook)
                .then(() => log.info(`Sent daily record to Discord (${i})`))
                .catch(err => {
                    this.handleSendDailyCountError(err, webhook, i);
                });
        });
    }

    private resendDailyCount(webhook: Webhook, urlIndex: number): void {
        sendWebhook(priceUpdateWebhookURLs[urlIndex], webhook)
            .then(() => log.info(`Resent daily record to Discord (${urlIndex})`))
            .catch(err => {
                this.handleSendDailyCountError(err, webhook, urlIndex);
            });
    }

    private handleSendDailyCountError(err: any, webhook: Webhook, urlIndex: number): void {
        if (err.text) {
            const errContent = JSON.parse(err.text);
            if (errContent?.message === 'The resource is being rate limited.') {
                setTimeout(() => {
                    // retry to send after the retry value + 10 seconds
                    this.resendDailyCount(webhook, urlIndex);
                }, errContent.retry_after + 10000);
            }
        }
    }

    static transformPricesFromPricer(prices: Item[]): { [p: string]: Item } {
        return prices.reduce((obj, i) => {
            obj[i.sku] = i;
            return obj;
        }, {});
    }

    sendWebHookPriceUpdateV1(
        sku: string,
        prices: Prices,
        time: number,
        buyChangesValue: number | null,
        sellChangesValue: number | null
    ): void {
        const baseItemData = this.schema.getItemBySKU(sku);
        const item = SKU.fromString(sku);
        const itemName = this.schema.getName(item, false);
        const parts = sku.split(';');

        let itemImageUrlPrint: string;

        if (!baseItemData || !item) {
            itemImageUrlPrint = 'https://jberlife.com/wp-content/uploads/2019/07/sorry-image-not-available.jpg';
        } else if (
            itemName.includes('Non-Craftable') &&
            itemName.includes('Killstreak') &&
            itemName.includes('Kit') &&
            !itemName.includes('Fabricator')
        ) {
            // Get image for Non-Craftable Killstreak/Specialized Killstreak/Professional Killstreak [Weapon] Kit
            const front =
                'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0du1AHE66AL6lNU5Fw_2yIWtaMjIpQmjAT';

            const url = itemName.includes('Specialized')
                ? ks2Images[item.target]
                : itemName.includes('Professional')
                ? ks3Images[item.target]
                : ks1Images[item.target];

            if (url) {
                itemImageUrlPrint = `${front}${url}/520fx520f`;
            }

            if (!itemImageUrlPrint) {
                itemImageUrlPrint = baseItemData.image_url_large;
            }
        } else if (
            (itemName.includes('Strangifier') && !itemName.includes('Chemistry Set')) ||
            itemName.includes('Unusualifier')
        ) {
            const front =
                'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0du1AHE66AL6lNU5Fw_2yIWtaMjIpQmjAT';
            const url = itemName.includes('Unusualifier')
                ? unusualifierImages[item.target]
                : strangifierImages[item.target];

            if (url) {
                itemImageUrlPrint = `${front}${url}/520fx520f`;
            }

            if (!itemImageUrlPrint) {
                itemImageUrlPrint = baseItemData.image_url_large;
            }
        } else if (paintCans.includes(`${item.defindex}`)) {
            itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICf${
                paintCan[item.defindex]
            }520fx520f`;
        } else if (item.australium === true) {
            // No festivized image available for Australium
            itemImageUrlPrint = australiumImageURL[item.defindex]
                ? `https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgE${
                      australiumImageURL[item.defindex]
                  }520fx520f`
                : itemImageUrlPrint;
        } else if (item.paintkit !== null) {
            const newItem = SKU.fromString(`${item.defindex};6`);
            itemImageUrlPrint = `https://scrap.tf/img/items/warpaint/${encodeURIComponent(
                this.schema.getName(newItem, false)
            )}_${item.paintkit}_${item.wear}_${item.festive === true ? 1 : 0}.png`;
        } else if (item.festive) {
            const front =
                'https://community.cloudflare.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEMaQkUTxr2vTx8';
            itemImageUrlPrint = festivizedImages[item.defindex]
                ? `${front}${festivizedImages[item.defindex]}/520fx520f`
                : baseItemData.image_url_large;
        } else {
            itemImageUrlPrint = baseItemData.image_url_large;
        }

        let effectsId: string;
        if (parts[2]) {
            effectsId = parts[2].replace('u', '');
        }

        let effectURL: string;
        if (!effectsId) {
            effectURL = '';
        } else effectURL = `https://autobot.tf/images/effects/${effectsId}_94x94.png`;

        const qualityItem = parts[1];
        const qualityColorPrint = qualityColor[qualityItem];

        const keyPrice = this.keyPrice;

        let entry = this.prices[sku];

        if (entry === undefined) {
            this.prices[sku] = Entry.fromData({
                sku: sku,
                buy:
                    prices.buy === null
                        ? new Currencies({
                              keys: 0,
                              metal: 0
                          })
                        : prices.buy,
                sell:
                    prices.sell === null
                        ? new Currencies({
                              keys: 0,
                              metal: 0
                          })
                        : prices.sell,
                time: time
            });

            entry = this.prices[sku];
        }

        const oldPrices = {
            buy: entry.buy,
            sell: entry.sell
        };

        const newPrices = {
            buy: new Currencies(prices.buy),
            sell: new Currencies(prices.sell)
        };

        if (buyChangesValue === null || sellChangesValue === null) {
            const oldBuyValue = oldPrices.buy.toValue(keyPrice);
            const oldSellValue = oldPrices.sell.toValue(keyPrice);

            const newBuyValue = newPrices.buy.toValue(keyPrice);
            const newSellValue = newPrices.sell.toValue(keyPrice);

            buyChangesValue = Math.round(newBuyValue - oldBuyValue);
            sellChangesValue = Math.round(newSellValue - oldSellValue);
        }

        const buyChanges = Currencies.toCurrencies(buyChangesValue).toString();
        const sellChanges = Currencies.toCurrencies(sellChangesValue).toString();

        const priceUpdate: Webhook = {
            username: webhookDisplayName,
            avatar_url: webhookAvatarURL,
            content: '',
            embeds: [
                {
                    author: {
                        name: itemName,
                        url: `https://autobot.tf/items/${sku}`,
                        icon_url:
                            'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3d/3dba19679c4a689b9d24fa300856cbf3d948d631_full.jpg'
                    },
                    footer: {
                        text: `${sku} • ${String(new Date(time * 1000)).replace(
                            'Coordinated Universal Time',
                            'UTC'
                        )} • v${botVersion}`
                    },
                    thumbnail: {
                        url: itemImageUrlPrint
                    },
                    image: {
                        url: effectURL
                    },
                    title: '',
                    fields: [
                        {
                            name: 'Buying for',
                            value: `${oldPrices.buy.toString()} → ${newPrices.buy.toString()} (${
                                buyChangesValue > 0 ? `+${buyChanges}` : buyChangesValue === 0 ? `0 ref` : buyChanges
                            })`
                        },
                        {
                            name: 'Selling for',
                            value: `${oldPrices.sell.toString()} → ${newPrices.sell.toString()} (${
                                sellChangesValue > 0
                                    ? `+${sellChanges}`
                                    : sellChangesValue === 0
                                    ? `0 ref`
                                    : sellChanges
                            })`
                        }
                    ],
                    description: webhookNote,
                    color: qualityColorPrint
                }
            ]
        };

        PriceUpdateQueue.enqueue(sku, priceUpdate);
    }

    // This is for sending multiple embeds in a single webhook request
    // sendWebHookPriceUpdateV2(data: { sku: string; name: string; prices: Prices; time: number }[]): void {
    //     const embed: Embeds[] = [];

    //     data.forEach(data => {
    //         const parts = data.sku.split(';');
    //         const newSku = parts[0] + ';6';
    //         const newItem = SKU.fromString(newSku);
    //         const newName = this.schema.getName(newItem, false);

    //         const itemImageUrl = this.schema.getItemByItemName(newName);

    //         let itemImageUrlPrint: string;

    //         const item = SKU.fromString(data.sku);

    //         if (!itemImageUrl || !item) {
    //             if (item?.defindex === 266) {
    //                 itemImageUrlPrint =
    //                     'https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEIUw8UXB_2uTNGmvfqDOCLDa5Zwo03sMhXgDQ_xQciY7vmYTRmKwDGUKENWfRt8FnvDSEwu5RlBYfnuasILma6aCYE/512fx512f';
    //             } else {
    //                 itemImageUrlPrint = 'https://jberlife.com/wp-content/uploads/2019/07/sorry-image-not-available.jpg';
    //             }
    //         } else if (
    //             data.name.includes('Non-Craftable') &&
    //             data.name.includes('Killstreak') &&
    //             data.name.includes('Kit') &&
    //             !data.name.includes('Fabricator')
    //         ) {
    //             // Get image for Non-Craftable Killstreak/Specialized Killstreak/Professional Killstreak [Weapon] Kit
    //             const front =
    //                 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0du1AHE66AL6lNU5Fw_2yIWtaMjIpQmjAT';

    //             const url = data.name.includes('Specialized')
    //                 ? ks2Images[data.sku]
    //                 : data.name.includes('Professional')
    //                 ? ks3Images[data.sku]
    //                 : ks1Images[data.sku];

    //             if (url) {
    //                 itemImageUrlPrint = `${front}${url}/520fx520f`;
    //             }

    //             if (!itemImageUrlPrint) {
    //                 itemImageUrlPrint = itemImageUrl.image_url_large;
    //             }
    //         } else if (data.name.includes('Strangifier') && !data.name.includes('Chemistry Set')) {
    //             const front =
    //                 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0du1AHE66AL6lNU5Fw_2yIWtaMjIpQmjAT';
    //             const url = strangifierImages[data.sku];

    //             if (url) {
    //                 itemImageUrlPrint = `${front}${url}/520fx520f`;
    //             }

    //             if (!itemImageUrlPrint) {
    //                 itemImageUrlPrint = itemImageUrl.image_url_large;
    //             }
    //         } else if (Object.keys(paintCanImages).includes(newSku)) {
    //             itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICf${paintCanImages[newSku]}512fx512f`;
    //         } else if (item.australium === true) {
    //             const australiumSKU = parts[0] + ';11;australium';
    //             itemImageUrlPrint = `https://steamcommunity-a.akamaihd.net/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgE${australiumImages[australiumSKU]}512fx512f`;
    //         } else if (item.paintkit !== null) {
    //             itemImageUrlPrint = `https://scrap.tf/img/items/warpaint/${encodeURIComponent(newName)}_${
    //                 item.paintkit
    //             }_${item.wear}_${item.festive === true ? 1 : 0}.png`;
    //         } else {
    //             itemImageUrlPrint = itemImageUrl.image_url_large;
    //         }

    //         let effectsId: string;

    //         if (parts[2]) {
    //             effectsId = parts[2].replace('u', '');
    //         }

    //         let effectURL: string;

    //         if (!effectsId) {
    //             effectURL = '';
    //         } else {
    //             effectURL = `https://marketplace.tf/images/particles/${effectsId}_94x94.png`;
    //         }

    //         const qualityItem = parts[1];
    //         const qualityColorPrint = qualityColor[qualityItem].toString();

    //         const keyPrice = this.keyPrice;

    //         let entry = this.prices[data.sku];

    //         if (entry === undefined) {
    //             this.prices[data.sku] = Entry.fromData({
    //                 sku: data.sku,
    //                 buy:
    //                     data.prices.buy === null
    //                         ? new Currencies({
    //                               keys: 0,
    //                               metal: 0
    //                           })
    //                         : data.prices.buy,
    //                 sell:
    //                     data.prices.sell === null
    //                         ? new Currencies({
    //                               keys: 0,
    //                               metal: 0
    //                           })
    //                         : data.prices.sell,
    //                 time: data.time
    //             });

    //             entry = this.prices[data.sku];
    //         }

    //         const oldPrices = {
    //             buy: entry.buy,
    //             sell: entry.sell
    //         };

    //         const oldBuyValue = oldPrices.buy.toValue(keyPrice);
    //         const oldSellValue = oldPrices.sell.toValue(keyPrice);

    //         const newPrices = {
    //             buy: new Currencies(data.prices.buy),
    //             sell: new Currencies(data.prices.sell)
    //         };

    //         const newBuyValue = newPrices.buy.toValue(keyPrice);
    //         const newSellValue = newPrices.sell.toValue(keyPrice);

    //         this.prices[data.sku].buy = newPrices.buy;
    //         this.prices[data.sku].sell = newPrices.sell;

    //         const buyChangesValue = Math.round(newBuyValue - oldBuyValue);
    //         const buyChanges = Currencies.toCurrencies(buyChangesValue).toString();
    //         const sellChangesValue = Math.round(newSellValue - oldSellValue);
    //         const sellChanges = Currencies.toCurrencies(sellChangesValue).toString();

    //         embed.push({
    //             author: {
    //                 name: data.name,
    //                 url: `https://autobot.tf/items/${data.sku}`,
    //                 icon_url:
    //                     'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3d/3dba19679c4a689b9d24fa300856cbf3d948d631_full.jpg'
    //             },
    //             footer: {
    //                 text: `${data.sku} • ${String(new Date(data.time * 1000)).replace(
    //                     'Coordinated Universal Time',
    //                     'UTC'
    //                 )} • v${botVersion}`
    //             },
    //             thumbnail: {
    //                 url: itemImageUrlPrint
    //             },
    //             image: {
    //                 url: effectURL
    //             },
    //             title: '',
    //             fields: [
    //                 {
    //                     name: 'Buying for',
    //                     value: `${oldPrices.buy.toString()} → ${newPrices.buy.toString()} (${
    //                         buyChangesValue > 0 ? `+${buyChanges}` : buyChangesValue === 0 ? `0 ref` : buyChanges
    //                     })`
    //                 },
    //                 {
    //                     name: 'Selling for',
    //                     value: `${oldPrices.sell.toString()} → ${newPrices.sell.toString()} (${
    //                         sellChangesValue > 0 ? `+${sellChanges}` : sellChangesValue === 0 ? `0 ref` : sellChanges
    //                     })`
    //                 }
    //             ],
    //             description: webhookNote,
    //             color: qualityColorPrint
    //         });
    //     });

    //     const priceUpdate: Webhook = {
    //         username: webhookDisplayName,
    //         avatar_url: webhookAvatarURL,
    //         content: '',
    //         embeds: embed
    //     };

    //     const skus = data.map(d => d.sku);

    //     priceUpdateWebhookURLs.forEach((url, i) => {
    //         sendWebhook(url, priceUpdate)
    //             .then(() => {
    //                 log.info(`Sent ${skus.join(', ')} update to Discord ${i}`);
    //             })
    //             .catch(err => {
    //                 log.error(`❌ Failed to send ${skus.join(', ')} price update webhook to Discord ${i}: `, err);
    //             });
    //     });
    // }

    private waitNextMention(): void {
        const hour12 = 12 * 60 * 60 * 1000;
        setTimeout(() => {
            this.isMentionKeyPrices = false;
        }, hour12);
    }

    sendWebhookKeyUpdate(sku: string, prices: Prices, time: number): void {
        const itemImageUrl = this.schema.getItemByItemName('Mann Co. Supply Crate Key');

        const priceUpdate: Webhook = {
            username: webhookDisplayName,
            avatar_url: webhookAvatarURL,
            content: '',
            embeds: [
                {
                    author: {
                        name: 'Mann Co. Supply Crate Key',
                        url: `https://autobot.tf/items/${sku}`,
                        icon_url:
                            'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/3d/3dba19679c4a689b9d24fa300856cbf3d948d631_full.jpg'
                    },
                    footer: {
                        text: `${sku} • ${String(new Date(time * 1000)).replace(
                            'Coordinated Universal Time',
                            'UTC'
                        )} • v${botVersion}`
                    },
                    thumbnail: {
                        url: itemImageUrl.image_url_large
                    },
                    title: '',
                    fields: [
                        {
                            name: 'Buying for',
                            value: `${prices.buy.keys > 0 ? `${prices.buy.keys} keys, ` : ''}${prices.buy.metal} ref`,
                            inline: true
                        },
                        {
                            name: 'Selling for',
                            value: `${prices.sell.keys > 0 ? `${prices.sell.keys} keys, ` : ''}${
                                prices.sell.metal
                            } ref`,
                            inline: true
                        }
                    ],
                    description: webhookNote,
                    color: '16766720'
                }
            ]
        };

        // send key price update to only key price update webhook.
        keyPriceWebhookURLs.forEach((url, i) => {
            if (this.isMentionKeyPrices === false) {
                priceUpdate.content = KeyPriceRoleIDs[i] === 'no role' ? '' : `<@&${KeyPriceRoleIDs[i]}>`;

                if (keyPriceWebhookURLs.length - i === 1) {
                    this.isMentionKeyPrices = true;
                    this.waitNextMention();
                }
            }

            sendWebhook(url, priceUpdate)
                .then(() => {
                    log.info(`Sent key prices update to Discord ${i}`);
                })
                .catch(err => {
                    log.error(`❌ Failed to send key prices update webhook to Discord ${i}: `, err);
                });
        });
    }
}

function sendWebhook(url: string, webhook: Webhook): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.onreadystatechange = (): void => {
            if (request.readyState === 4) {
                if (request.status === 204) {
                    resolve();
                } else {
                    reject({ text: request.responseText, webhook });
                }
            }
        };

        request.open('POST', url);
        request.setRequestHeader('Content-type', 'application/json');
        request.send(JSON.stringify(webhook));
    });
}

import { UnknownDictionary } from '../types/common';
import sleepasync from 'sleep-async';

export class PriceUpdateQueue {
    private static priceUpdate: UnknownDictionary<Webhook> = {};

    private static url: string[];

    static setURL(url: string[]) {
        this.url = url;
    }

    private static sleepTime = 1000;

    private static isRateLimited = false;

    private static isProcessing = false;

    static enqueue(sku: string, webhook: Webhook): void {
        this.priceUpdate[sku] = webhook;

        void this.process();
    }

    private static dequeue(): void {
        delete this.priceUpdate[this.first()];
    }

    private static first(): string {
        return Object.keys(this.priceUpdate)[0];
    }

    private static size(): number {
        return Object.keys(this.priceUpdate).length;
    }

    private static async process(): Promise<void> {
        const sku = this.first();

        if (sku === undefined || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        await sleepasync().Promise.sleep(this.sleepTime);

        if (this.isRateLimited) {
            this.sleepTime = 1000;
            this.isRateLimited = false;
        }

        this.url.forEach((url, i) => {
            sendWebhook(url, this.priceUpdate[sku])
                .then(() => {
                    log.info(`Sent ${sku} update to Discord ${i}`);
                })
                .catch(err => {
                    log.error(`❌ Failed to send ${sku} price update webhook to Discord ${i}: `, err);

                    if (err.text) {
                        const errContent = JSON.parse(err.text);
                        if (errContent?.message === 'The resource is being rate limited.') {
                            this.sleepTime = errContent.retry_after;
                            this.isRateLimited = true;
                        }
                    }
                })
                .finally(() => {
                    if (this.url.length - i === 1) {
                        // Last, then we dequeue.
                        this.isProcessing = false;
                        this.dequeue();
                        void this.process();
                    }
                });
        });
    }
}

interface Author {
    name: string;
    url?: string;
    icon_url?: string;
}

interface Fields {
    name: string;
    value: string;
    inline?: boolean;
}

interface Footer {
    text: string;
    icon_url?: string;
}

interface Thumbnail {
    url: string;
}

interface Image {
    url: string;
}

interface Embeds {
    color?: string;
    author?: Author;
    title?: string;
    url?: string;
    description?: string;
    fields?: Fields[];
    thumbnail?: Thumbnail;
    image?: Image;
    footer?: Footer;
}

export interface Webhook {
    username?: string;
    avatar_url?: string;
    content?: string;
    embeds?: Embeds[];
}
