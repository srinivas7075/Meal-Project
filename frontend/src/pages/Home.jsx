import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Star, MessageSquare, Send, X, Bot, User, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Home.css';

// Fake nutritional data generator (since TheMealDB doesn't provide macros)
const getFakeNutrition = (mealName) => {
    const hash = mealName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
        calories: 280 + (hash % 350),
        protein: 12 + (hash % 28),
        carbs: 20 + (hash % 45),
        fat: 5 + (hash % 25),
        fiber: 2 + (hash % 8),
    };
};

const Home = () => {
    const [query, setQuery] = useState('');
    const [meals, setMeals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const { user } = useAuth();

    // Wishlist helpers
    const wishlistKey = user ? `wishlist_${user.username}` : 'wishlist_guest';
    const [wishlist, setWishlist] = useState(() => {
        try { return JSON.parse(localStorage.getItem(wishlistKey) || '[]'); }
        catch { return []; }
    });
    useEffect(() => { localStorage.setItem(wishlistKey, JSON.stringify(wishlist)); }, [wishlist, wishlistKey]);
    const isWishlisted = (id) => wishlist.some(m => m.idMeal === id);
    const toggleWishlist = (meal) => {
        setWishlist(prev =>
            isWishlisted(meal.idMeal)
                ? prev.filter(m => m.idMeal !== meal.idMeal)
                : [...prev, meal]
        );
    };

    // Sidebar chatbot state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { role: 'bot', text: "👋 Hi! I'm your AI Chef. Ask me anything about a recipe — ingredients, cooking tips, nutrition and more!" }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const searchMeals = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setSearched(true);
        setMeals([]);

        try {
            const res = await axios.post('http://127.0.0.1:8000/meals/search', { query });
            setMeals(res.data.meals);
        } catch (error) {
            console.error("Search error", error);
        } finally {
            setLoading(false);
        }
    };

    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatLoading(true);

        try {
            const res = await axios.post('http://127.0.0.1:8000/meals/ask', { query: userMsg });
            const answer = res.data.answer;

            // Detect if message is about a specific meal for nutrition card
            const mealKeywords = ['make', 'recipe', 'cook', 'ingredient', 'nutrition', 'calorie', 'protein', 'about'];
            const mealMatch = meals.find(m => userMsg.toLowerCase().includes(m.strMeal.toLowerCase()));
            const showNutrition = mealMatch || mealKeywords.some(k => userMsg.toLowerCase().includes(k));

            setChatMessages(prev => [...prev, {
                role: 'bot',
                text: answer,
                nutrition: showNutrition && mealMatch ? getFakeNutrition(mealMatch.strMeal) : null,
                mealName: mealMatch?.strMeal || null,
            }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'bot', text: "Sorry, I couldn't reach the server. Make sure the backend is running!" }]);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="home-container">
            {/* Hero Section */}
            <section className={`hero-section ${searched ? 'compact' : ''}`}>
                <div className="hero-content">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="hero-title">
                            Taste the <span className="highlight">Extraordinary</span>
                        </h1>
                        {!searched && (
                            <p className="hero-subtitle">
                                Search thousands of recipes and chat with your AI Chef.
                            </p>
                        )}
                    </motion.div>

                    <motion.form
                        className="search-bar-wrapper"
                        onSubmit={searchMeals}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <Search className="search-icon" size={24} />
                        <input
                            type="text"
                            placeholder="Search for a recipe... (e.g., Chicken, Pasta)"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Searching...' : 'Explore'}
                            {!loading && <ChevronRight size={20} />}
                        </button>
                    </motion.form>
                </div>
            </section>

            {/* Results Section */}
            {(searched && meals.length > 0) && (
                <div className="results-section">
                    <h2 className="section-title">Found Recipes</h2>
                    <div className="meals-grid">
                        {meals.map((meal, index) => (
                            <motion.div
                                key={meal.idMeal}
                                className="meal-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08 }}
                                whileHover={{ y: -8 }}
                            >
                                <div className="card-image">
                                    <img src={meal.strMealThumb} alt={meal.strMeal} />
                                    <div className="card-overlay">
                                        <div className="card-actions">
                                            <Link to={`/recipe/${meal.idMeal}`} className="btn-card">View Recipe</Link>
                                            <button
                                                className={`wishlist-heart ${isWishlisted(meal.idMeal) ? 'active' : ''}`}
                                                onClick={() => toggleWishlist(meal)}
                                                title={isWishlisted(meal.idMeal) ? 'Remove from wishlist' : 'Add to wishlist'}
                                            >
                                                <Heart size={18} fill={isWishlisted(meal.idMeal) ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-content">
                                    <div className="card-header-row">
                                        <h3>{meal.strMeal}</h3>
                                        <div className="rating">
                                            <Star size={14} fill="#FFA502" color="#FFA502" />
                                            <span>4.8</span>
                                        </div>
                                    </div>
                                    {/* Nutrition snippet */}
                                    <div className="nutrition-bar">
                                        {(() => {
                                            const n = getFakeNutrition(meal.strMeal);
                                            return (
                                                <>
                                                    <span className="nut-item cal">🔥 {n.calories} kcal</span>
                                                    <span className="nut-item pro">💪 {n.protein}g protein</span>
                                                    <span className="nut-item carb">🌾 {n.carbs}g carbs</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="card-meta">
                                        <span className="tag">{meal.strCategory}</span>
                                        <span className="tag outline">{meal.strArea}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Floating Chat Button */}
            <motion.button
                className="chat-fab"
                onClick={() => setSidebarOpen(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Ask AI Chef"
            >
                <MessageSquare size={26} />
                <span>AI Chef</span>
            </motion.button>

            {/* Sidebar Chatbot */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            className="chat-sidebar"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        >
                            {/* Sidebar Header */}
                            <div className="sidebar-header">
                                <div className="sidebar-title">
                                    <Bot size={22} />
                                    <span>AI Chef Assistant</span>
                                </div>
                                <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="chat-messages">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className={`chat-bubble-wrap ${msg.role}`}>
                                        <div className="chat-avatar">
                                            {msg.role === 'bot' ? <Bot size={16} /> : <User size={16} />}
                                        </div>
                                        <div className="chat-bubble-block">
                                            <div className={`chat-bubble ${msg.role}`}>
                                                {msg.text}
                                            </div>
                                            {/* Nutrition Card */}
                                            {msg.nutrition && (
                                                <div className="nutrition-card">
                                                    <p className="nut-card-title">📊 Nutrition for {msg.mealName}</p>
                                                    <div className="nut-grid">
                                                        <div className="nut-cell"><span className="nut-val">{msg.nutrition.calories}</span><span className="nut-lbl">Calories</span></div>
                                                        <div className="nut-cell"><span className="nut-val">{msg.nutrition.protein}g</span><span className="nut-lbl">Protein</span></div>
                                                        <div className="nut-cell"><span className="nut-val">{msg.nutrition.carbs}g</span><span className="nut-lbl">Carbs</span></div>
                                                        <div className="nut-cell"><span className="nut-val">{msg.nutrition.fat}g</span><span className="nut-lbl">Fat</span></div>
                                                        <div className="nut-cell"><span className="nut-val">{msg.nutrition.fiber}g</span><span className="nut-lbl">Fiber</span></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="chat-bubble-wrap bot">
                                        <div className="chat-avatar"><Bot size={16} /></div>
                                        <div className="chat-bubble bot typing">
                                            <span /><span /><span />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <form className="sidebar-input" onSubmit={sendChatMessage}>
                                <input
                                    type="text"
                                    placeholder="Ask about any meal..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    disabled={chatLoading}
                                />
                                <button type="submit" disabled={chatLoading || !chatInput.trim()}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;
