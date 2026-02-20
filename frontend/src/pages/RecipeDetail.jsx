import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Clock, MapPin, ChefHat,
    MessageSquare, Send, Heart, CheckCircle, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './RecipeDetail.css';

const RecipeDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [meal, setMeal] = useState(null);
    const [chatQuery, setChatQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [loadingChat, setLoadingChat] = useState(false);

    // ── localStorage keys scoped by user ──────────────────────────────────
    const key = (type) => user ? `${type}_${user.username}` : `${type}_guest`;

    // ── Wishlist ──────────────────────────────────────────────────────────
    const [wishlist, setWishlist] = useState(() => {
        try { return JSON.parse(localStorage.getItem(key('wishlist')) || '[]'); }
        catch { return []; }
    });
    const isWishlisted = wishlist.some(m => m.idMeal === id);
    const toggleWishlist = () => {
        setWishlist(prev => {
            const next = isWishlisted
                ? prev.filter(m => m.idMeal !== id)
                : [...prev, {
                    idMeal: meal.idMeal,
                    strMeal: meal.strMeal,
                    strCategory: meal.strCategory,
                    strArea: meal.strArea,
                    strMealThumb: meal.strMealThumb,
                }];
            localStorage.setItem(key('wishlist'), JSON.stringify(next));
            return next;
        });
    };

    // ── Cooked ────────────────────────────────────────────────────────────
    const [cooked, setCooked] = useState(() => {
        try { return JSON.parse(localStorage.getItem(key('cooked')) || '[]'); }
        catch { return []; }
    });
    const isCooked = cooked.includes(id);
    const toggleCooked = () => {
        setCooked(prev => {
            const next = isCooked ? prev.filter(x => x !== id) : [...prev, id];
            localStorage.setItem(key('cooked'), JSON.stringify(next));
            return next;
        });
    };

    // ── Star Rating ───────────────────────────────────────────────────────
    const ratingsKey = key('ratings');
    const [ratings, setRatings] = useState(() => {
        try { return JSON.parse(localStorage.getItem(ratingsKey) || '{}'); }
        catch { return {}; }
    });
    const [hoverStar, setHoverStar] = useState(0);
    const myRating = ratings[id] || 0;
    const setRating = (star) => {
        setRatings(prev => {
            const next = { ...prev, [id]: star };
            localStorage.setItem(ratingsKey, JSON.stringify(next));
            return next;
        });
    };

    // ── Fetch meal ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchMeal = async () => {
            try {
                const res = await axios.get(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
                if (res.data.meals) setMeal(res.data.meals[0]);
            } catch (err) {
                console.error('Error fetching meal', err);
            }
        };
        fetchMeal();
    }, [id]);

    // ── AI Chat ───────────────────────────────────────────────────────────
    const handleAsk = async (e) => {
        e.preventDefault();
        if (!chatQuery.trim()) return;
        const userMsg = { role: 'user', text: chatQuery };
        setChatHistory(prev => [...prev, userMsg]);
        setChatQuery('');
        setLoadingChat(true);
        try {
            const res = await axios.post('http://127.0.0.1:8000/meals/ask', {
                query: `Regarding ${meal.strMeal}: ${userMsg.text}`,
            });
            setChatHistory(prev => [...prev, { role: 'ai', text: res.data.answer }]);
        } catch {
            setChatHistory(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't connect to the chef." }]);
        } finally {
            setLoadingChat(false);
        }
    };

    if (!meal) return <div className="loading">Loading Chef's Secret...</div>;

    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        if (meal[`strIngredient${i}`]?.trim()) {
            ingredients.push({ item: meal[`strIngredient${i}`], measure: meal[`strMeasure${i}`] });
        }
    }

    return (
        <div className="recipe-page">
            <Link to="/" className="back-btn"><ArrowLeft size={24} /></Link>

            {/* Hero */}
            <div className="recipe-hero">
                <div className="hero-bg" style={{ backgroundImage: `url(${meal.strMealThumb})` }} />
                <div className="hero-overlay" />
                <div className="hero-content-recipe">
                    <motion.span className="category-badge"
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                        {meal.strCategory}
                    </motion.span>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {meal.strMeal}
                    </motion.h1>
                    <motion.div className="meta-row"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <div className="meta-item"><MapPin size={18} /> {meal.strArea}</div>
                        <div className="meta-item"><ChefHat size={18} /> {meal.strCategory}</div>
                    </motion.div>

                    {/* ── Action Buttons ── */}
                    <motion.div className="recipe-actions"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>

                        {/* Wishlist */}
                        <button
                            className={`action-btn wishlist-btn ${isWishlisted ? 'active' : ''}`}
                            onClick={toggleWishlist}
                            title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        >
                            <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                            {isWishlisted ? 'Wishlisted' : 'Wishlist'}
                        </button>

                        {/* Mark as Cooked */}
                        <button
                            className={`action-btn cooked-btn ${isCooked ? 'active' : ''}`}
                            onClick={toggleCooked}
                            title={isCooked ? 'Mark as uncooked' : 'Mark as cooked'}
                        >
                            <CheckCircle size={18} />
                            {isCooked ? 'Cooked ✓' : 'Mark Cooked'}
                        </button>

                        {/* Star Rating */}
                        <div className="action-btn rating-btn">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                    key={star}
                                    size={20}
                                    className={`star ${star <= (hoverStar || myRating) ? 'filled' : ''}`}
                                    fill={star <= (hoverStar || myRating) ? '#f9ca24' : 'none'}
                                    onMouseEnter={() => setHoverStar(star)}
                                    onMouseLeave={() => setHoverStar(0)}
                                    onClick={() => setRating(star)}
                                />
                            ))}
                            {myRating > 0 && <span className="rating-label">{myRating}/5</span>}
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="recipe-layout">
                {/* Left: Ingredients + Chat */}
                <div className="col-left">
                    <div className="section-card ingredients-card">
                        <h2>Ingredients</h2>
                        <ul className="ingredients-list">
                            {ingredients.map((ing, i) => (
                                <li key={i}>
                                    <span className="measure">{ing.measure}</span>
                                    <span className="item">{ing.item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* AI Chat */}
                    <div className="section-card chat-card">
                        <div className="chat-header">
                            <MessageSquare size={20} className="text-primary" />
                            <h3>Ask the Chef</h3>
                        </div>
                        <div className="chat-window">
                            {chatHistory.length === 0 && (
                                <div className="chat-empty">
                                    <p>Ask about calories, substitutes, or wine pairings!</p>
                                </div>
                            )}
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`chat-msg ${msg.role}`}>{msg.text}</div>
                            ))}
                            {loadingChat && <div className="chat-msg ai typing">...</div>}
                        </div>
                        <form onSubmit={handleAsk} className="chat-input">
                            <input
                                type="text"
                                placeholder="Ask a question..."
                                value={chatQuery}
                                onChange={(e) => setChatQuery(e.target.value)}
                            />
                            <button type="submit" disabled={loadingChat}><Send size={18} /></button>
                        </form>
                    </div>
                </div>

                {/* Right: Instructions */}
                <div className="col-right">
                    <div className="section-card instructions-card">
                        <h2>Instructions</h2>
                        <div className="instructions-text">
                            {meal.strInstructions.split('\r\n').map((step, i) => (
                                step.trim() && <p key={i}>{step}</p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeDetail;
