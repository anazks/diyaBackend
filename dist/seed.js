"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
dotenv_1.default.config();
const User_1 = require("./models/User");
const Album_1 = require("./models/Album");
const Memory_1 = require("./models/Memory");
const Video_1 = require("./models/Video");
const AudioMemory_1 = require("./models/AudioMemory");
const TimelineEvent_1 = require("./models/TimelineEvent");
const Letter_1 = require("./models/Letter");
const Contribution_1 = require("./models/Contribution");
const SpecialDate_1 = require("./models/SpecialDate");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/until_we_meet_again';
async function seed() {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('🕊️ Connected to MongoDB for memorial seeding...');
        // Clear existing records
        await Promise.all([
            User_1.User.deleteMany({}),
            Album_1.Album.deleteMany({}),
            Memory_1.Memory.deleteMany({}),
            Video_1.Video.deleteMany({}),
            AudioMemory_1.AudioMemory.deleteMany({}),
            TimelineEvent_1.TimelineEvent.deleteMany({}),
            Letter_1.Letter.deleteMany({}),
            Contribution_1.Contribution.deleteMany({}),
            SpecialDate_1.SpecialDate.deleteMany({}),
        ]);
        console.log('Cleared existing memorial data.');
        // 1. Create Users
        const passwordHash = await bcryptjs_1.default.hash('password123', 10);
        const admin = await User_1.User.create({
            name: 'Arjun Sharma',
            email: 'arjun@memorial.family',
            password: passwordHash,
            role: 'admin',
            relationship: 'Elder Brother',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        });
        const mother = await User_1.User.create({
            name: 'Sunita Sharma',
            email: 'mom@memorial.family',
            password: passwordHash,
            role: 'family_member',
            relationship: 'Mother',
            avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
        });
        const friend = await User_1.User.create({
            name: 'Priya Mehra',
            email: 'priya@memorial.family',
            password: passwordHash,
            role: 'contributor',
            relationship: 'Best Friend',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
        });
        console.log('Created Users (Admin: arjun@memorial.family / password123)');
        // 2. Create Albums
        const albumChildhood = await Album_1.Album.create({
            title: 'Golden Childhood',
            description: 'The innocent laughter, silly pigtails, and endless garden adventures.',
            category: 'Childhood',
            coverImageUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80',
            createdBy: admin._id,
            itemCount: 4,
        });
        const albumTravel = await Album_1.Album.create({
            title: 'Journeys & Wanderlust',
            description: 'Diya wandering through quiet mountain trails and sunny coastlines.',
            category: 'Travel',
            coverImageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
            createdBy: admin._id,
            itemCount: 4,
        });
        const albumCelebrations = await Album_1.Album.create({
            title: 'Festivals of Light',
            description: 'Diwali nights, birthdays, and the radiant smile that lit up every room.',
            category: 'Celebrations',
            coverImageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
            createdBy: mother._id,
            itemCount: 3,
        });
        const albumFamily = await Album_1.Album.create({
            title: 'Family Warmth',
            description: 'Sunday morning breakfasts, tight hugs, and quiet peaceful moments together.',
            category: 'Family',
            coverImageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80',
            createdBy: admin._id,
            itemCount: 3,
        });
        console.log('Created Albums');
        // 3. Create Photos (Memories)
        await Memory_1.Memory.create([
            {
                title: 'Her Favorite Flower Garden',
                description: 'Diya lost in thought amidst spring lavender blooms. Her absolute favourite season.',
                mediaType: 'photo',
                category: 'Favourite Moments',
                albumId: albumTravel._id,
                mediaUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1000&q=80',
                thumbnailUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=80',
                dateTaken: new Date('2022-04-18'),
                location: 'Shimla Botanical Gardens',
                isFavorite: true,
                uploadedBy: admin._id,
            },
            {
                title: 'Unstoppable Laughs',
                description: 'Captured when Arjun accidentally dropped the birthday cake candle into the cream.',
                mediaType: 'photo',
                category: 'Celebrations',
                albumId: albumCelebrations._id,
                mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80',
                thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                dateTaken: new Date('2023-04-14'),
                location: 'Family Living Room',
                isFavorite: true,
                uploadedBy: mother._id,
            },
            {
                title: 'Pigtails & Mud Pies',
                description: 'Age 6, completely convinced she was cooking a five-star meal in the backyard.',
                mediaType: 'photo',
                category: 'Childhood',
                albumId: albumChildhood._id,
                mediaUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=1000&q=80',
                thumbnailUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=400&q=80',
                dateTaken: new Date('2004-06-12'),
                location: 'Grandparents Backyard',
                isFavorite: true,
                uploadedBy: mother._id,
            },
            {
                title: 'Summit of Triund',
                description: 'She walked the last two kilometers in the freezing wind just to see the sunset clouds.',
                mediaType: 'photo',
                category: 'Travel',
                albumId: albumTravel._id,
                mediaUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1000&q=80',
                thumbnailUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
                dateTaken: new Date('2021-10-09'),
                location: 'Dharamshala, Himachal Pradesh',
                isFavorite: false,
                uploadedBy: admin._id,
            },
            {
                title: 'Family Chai Morning',
                description: 'Every Sunday began with her brewing ginger tea and demanding cookies.',
                mediaType: 'photo',
                category: 'Family',
                albumId: albumFamily._id,
                mediaUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1000&q=80',
                thumbnailUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80',
                dateTaken: new Date('2023-01-15'),
                location: 'Veranda at Sunrise',
                isFavorite: true,
                uploadedBy: admin._id,
            },
            {
                title: 'Diwali Diyas & Sparklers',
                description: 'Her favourite festival. She placed 50 diyas around the steps with precision.',
                mediaType: 'photo',
                category: 'Celebrations',
                albumId: albumCelebrations._id,
                mediaUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1000&q=80',
                thumbnailUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80',
                dateTaken: new Date('2022-11-04'),
                location: 'Home Courtyard',
                isFavorite: false,
                uploadedBy: mother._id,
            },
        ]);
        console.log('Created Photos');
        // 4. Create Videos
        await Video_1.Video.create([
            {
                title: 'Singing by the Bonfire',
                caption: 'Diya strumming her acoustic guitar softly while we all sat under the stars.',
                category: 'Favourite Moments',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80',
                duration: 84,
                uploadedBy: admin._id,
            },
            {
                title: 'Graduation Day Joy',
                caption: 'Tossing her cap into the air and running to hug Mom with tears of pure happiness.',
                category: 'Celebrations',
                mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                thumbnailUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
                duration: 110,
                uploadedBy: mother._id,
            },
        ]);
        console.log('Created Videos');
        // 5. Create Audio Memories (Voice notes)
        await AudioMemory_1.AudioMemory.create([
            {
                title: 'Her Birthday Voicemail to Arjun',
                description: 'Singing terribly out of tune on purpose, followed by her iconic infectious giggle.',
                mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                duration: 62,
                waveformPoints: [20, 45, 75, 90, 60, 85, 95, 70, 50, 65, 80, 55, 40, 30, 20],
                isFavorite: true,
                recordedDate: new Date('2023-09-12'),
                uploadedBy: admin._id,
            },
            {
                title: 'Story of the Lost Recipe',
                description: 'Diya explaining in voice note why her brownie experiment turned into crispy cookies.',
                mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
                duration: 48,
                waveformPoints: [30, 50, 40, 70, 60, 50, 85, 90, 60, 45, 35, 55, 65, 40, 25],
                isFavorite: true,
                recordedDate: new Date('2022-07-21'),
                uploadedBy: friend._id,
            },
            {
                title: 'Goodnight Blessing to Ma',
                description: 'Her gentle words before falling asleep when she visited home.',
                mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
                duration: 35,
                waveformPoints: [15, 25, 40, 50, 45, 60, 50, 40, 35, 30, 25, 20, 15, 10],
                isFavorite: false,
                recordedDate: new Date('2024-02-10'),
                uploadedBy: mother._id,
            },
        ]);
        console.log('Created Voice Memories');
        // 6. Create Timeline Events
        await TimelineEvent_1.TimelineEvent.create([
            {
                year: ,
                date: 'April 14, ',
                title: 'Welcome to the World, Little Angel',
                description: 'Diya arrived on a sunny Tuesday morning, bringing an ocean of warmth into our family.',
                location: 'Apollo Hospital, New Delhi',
                photos: ['https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80'],
                order: 1,
                createdBy: mother._id,
            },
            {
                year: 2004,
                date: 'July 5, 2004',
                title: 'First Day of Primary School',
                description: 'She didn’t cry for a single second. She marched in with her yellow backpack and made three friends in five minutes.',
                location: 'St. Mary’s Academy',
                photos: ['https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80'],
                order: 2,
                createdBy: mother._id,
            },
            {
                year: 2012,
                date: 'October 20, 2012',
                title: 'State Watercolor Art Gold Medal',
                description: 'Her painting of rainy old streets won first prize among five hundred students. She gave the trophy to her brother.',
                location: 'National Gallery of Modern Art',
                photos: ['https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80'],
                order: 3,
                createdBy: admin._id,
            },
            {
                year: 2016,
                date: 'June 18, 2016',
                title: 'High School Graduation',
                description: 'Valedictorian speech delivered with grace and humor that had the entire auditorium cheering.',
                location: 'School Amphitheatre',
                photos: ['https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80'],
                order: 4,
                createdBy: admin._id,
            },
            {
                year: 2020,
                date: 'May 28, 2020',
                title: 'B.Sc in Psychology with Highest Honors',
                description: 'Her deep compassion for people found its true calling. She dedicated her thesis to youth mental health.',
                location: 'University Auditorium',
                photos: ['https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80'],
                order: 5,
                createdBy: admin._id,
            },
            {
                year: 2022,
                date: 'October 12, 2022',
                title: 'The Great Himalayan Family Expedition',
                description: 'Four days of mountain mist, hot noodles, campfires, and Diya’s laughter echoing across the valleys.',
                location: 'Parvati Valley, Himachal',
                photos: ['https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80'],
                order: 6,
                createdBy: admin._id,
            },
        ]);
        console.log('Created Timeline Events');
        // 7. Create Letters & Messages
        await Letter_1.Letter.create([
            {
                senderName: 'Arjun',
                relationship: 'Elder Brother',
                title: 'To My Little Sister and Guiding Light',
                body: 'Diya, wherever you are among the stars, know that your laughter still echoes in every corner of our home. I still look for your smile whenever I brew morning coffee. Thank you for showing me what unconditional joy and courage look like. Some bonds never end. Love always, your brother.',
                paperStyle: 'cream',
                isPrivate: false,
                isDraft: false,
                createdBy: admin._id,
            },
            {
                senderName: 'Sunita (Ma)',
                relationship: 'Mother',
                title: 'My Sweetest Diya',
                body: 'My dearest child, twenty-six years of having you as my daughter were the greatest gift of my life. Your gentle hands, your singing in the shower, your kindness to stray animals... everything you touched became softer and brighter. Rest in peaceful light, my precious baby.',
                paperStyle: 'parchment',
                isPrivate: false,
                isDraft: false,
                createdBy: mother._id,
            },
            {
                senderName: 'Priya Mehra',
                relationship: 'Soul Sister & Best Friend',
                title: 'To 15 Years of Secrets and Giggles',
                body: 'Diya, remember when we promised we’d grow old together and yell at kids on our porches? I will keep living with twice the courage, once for me and once for you. I miss you every single day.',
                paperStyle: 'lavender',
                isPrivate: false,
                isDraft: false,
                createdBy: friend._id,
            },
        ]);
        console.log('Created Letters');
        // 8. Create Contributions (1 pending, 1 approved)
        await Contribution_1.Contribution.create([
            {
                contributorName: 'Rohan Sharma',
                relationship: 'Cousin',
                type: 'photo',
                title: 'Diya Teaching Me How to Skateboard',
                note: 'Found this in my old digital camera from 2018! She spent 3 hours holding my elbows so I wouldn’t fall.',
                mediaUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=800&q=80',
                category: 'Childhood',
                status: 'pending',
                submittedBy: friend._id,
            },
        ]);
        console.log('Created Family Contribution');
        // 9. Create Special Dates
        await SpecialDate_1.SpecialDate.create([
            {
                title: 'Diya’s Birthday',
                date: '-04-14',
                month: 4,
                day: 14,
                year: ,
                type: 'birthday',
                notes: 'We celebrate her life by planting yellow roses and sharing her favourite almond cake.',
                iconName: 'cake-variant',
            },
            {
                title: 'Remembrance Day',
                date: '2024-08-20',
                month: 8,
                day: 20,
                year: 2024,
                type: 'remembrance',
                notes: 'Quiet prayer gathering and floating candle release at dusk.',
                iconName: 'candle',
            },
            {
                title: 'Winter Family Reunion',
                date: '12-25',
                month: 12,
                day: 25,
                type: 'holiday',
                notes: 'Revisiting the memorial album together by the fireplace.',
                iconName: 'pine-tree',
            },
        ]);
        console.log('Created Special Dates');
        console.log('🕊️ Memorial Vault Database Seeded Successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}
seed();
