// Fisher-Yates Shuffle
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function getUniqueGenres(movies) {
    const genres = new Set();
    movies.forEach(m => {
        if (m.genres) {
            m.genres.forEach(g => genres.add(g));
        }
    });
    return Array.from(genres).sort();
}

function filterMovies(movies, selectedGenres, requiredPoolSize) {
    let filteredMovies;
    
    if (selectedGenres.length === 0) {
        // Exclude TV Shows by default if no specific genre is selected
        filteredMovies = movies.filter(m => !m.genres || !m.genres.includes('TV Shows'));
    } else {
        const genreMovies = movies.filter(m => 
            m.genres && m.genres.some(g => selectedGenres.includes(g))
        );
        
        if (genreMovies.length < requiredPoolSize) {
            // Get unique movies that are NOT in the current selection
            const existingTitles = new Set(genreMovies.map(m => m.title));
            const otherMovies = movies.filter(m => !existingTitles.has(m.title));
            const shuffledOthers = shuffle([...otherMovies]);
            const needed = requiredPoolSize - genreMovies.length;
            
            filteredMovies = [...genreMovies, ...shuffledOthers.slice(0, needed)];
        } else {
            filteredMovies = genreMovies;
        }
    }
    return filteredMovies;
}

function getSessionMovies(pool, count, consecutiveFailures) {
    let currentPool = [...pool];
    
    // Bias toward crowd-pleasers if failing to match
    if (consecutiveFailures > 0) {
        const crowdPleasers = currentPool.filter(m => m.isCrowdPleaser === true);
        const others = currentPool.filter(m => m.isCrowdPleaser !== true);
        
        if (crowdPleasers.length > 0) {
            // Mix them, but put crowd pleasers first
            currentPool = [...shuffle(crowdPleasers), ...shuffle(others)];
        } else {
            currentPool = shuffle(currentPool);
        }
    } else {
        currentPool = shuffle(currentPool);
    }
    
    return currentPool.slice(0, count);
}

function calculateMatches(userChoices, users) {
    const movieCounts = {};
    const movieLikers = {};

    users.forEach(userName => {
        const likes = userChoices[userName] || [];
        likes.forEach(title => {
            movieCounts[title] = (movieCounts[title] || 0) + 1;
            if (!movieLikers[title]) movieLikers[title] = [];
            movieLikers[title].push(userName);
        });
    });

    const perfectMatches = Object.keys(movieCounts).filter(title => movieCounts[title] === users.length);
    const commonMatches = Object.keys(movieCounts)
        .filter(title => movieCounts[title] > 1 && movieCounts[title] < users.length)
        .sort((a, b) => movieCounts[b] - movieCounts[a]);
        
    const nearMatches = Object.keys(movieCounts)
        .filter(title => movieCounts[title] >= Math.max(2, users.length - 2) && movieCounts[title] < users.length)
        .sort((a, b) => movieCounts[b] - movieCounts[a])
        .slice(0, 3);
        
    const outliers = Object.keys(movieCounts)
        .filter(title => movieCounts[title] === 1);

    return {
        movieCounts,
        movieLikers,
        perfectMatches,
        commonMatches,
        nearMatches,
        outliers
    };
}

function calculateCompatibility(users, userChoices) {
    const pairs = [];
    let freakyPair = null;
    let freakyScore = 0;

    for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
            const user1 = users[i];
            const user2 = users[j];
            
            const setA = new Set(userChoices[user1]);
            const setB = new Set(userChoices[user2]);
            const intersection = new Set([...setA].filter(x => setB.has(x)));
            const union = new Set([...setA, ...setB]);
            
            let score = 0;
            if (union.size > 0) {
                score = Math.round((intersection.size / union.size) * 100);
            }
            
            let verdict = 'Neutral';
            if (score > 95) verdict = 'GETTING FREAKY';
            else if (score > 70) verdict = 'Perfect Harmony';
            else if (score > 40) verdict = 'Good Vibes';
            else if (score < 15) verdict = 'Total Opposites';

            if (score > 95) {
                freakyPair = [user1, user2];
                freakyScore = score;
            }

            pairs.push({
                user1,
                user2,
                score,
                verdict
            });
        }
    }
    
    return { pairs, freakyPair, freakyScore };
}

module.exports = {
    shuffle,
    getUniqueGenres,
    filterMovies,
    getSessionMovies,
    calculateMatches,
    calculateCompatibility
};
