import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Heart, ChefHat, Star, Trash2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Wishlist stored in localStorage keyed by username
    const wishlistKey = user ? `wishlist_${user.username}` : 'wishlist_guest';
    const cookedKey = user ? `cooked_${user.username}` : 'cooked_guest';
    const ratingsKey = user ? `ratings_${user.username}` : 'ratings_guest';

    const [wishlist, setWishlist] = useState(() => {
        try { return JSON.parse(localStorage.getItem(wishlistKey) || '[]'); }
        catch { return []; }
    });
    const [cooked] = useState(() => {
        try { return JSON.parse(localStorage.getItem(cookedKey) || '[]'); }
        catch { return []; }
    });
    const [ratings] = useState(() => {
        try { return JSON.parse(localStorage.getItem(ratingsKey) || '{}'); }
        catch { return {}; }
    });
    const reviewCount = Object.keys(ratings).length;

    // Save wishlist whenever it changes
    useEffect(() => {
        localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
    }, [wishlist, wishlistKey]);

    const removeFromWishlist = (id) => {
        setWishlist(prev => prev.filter(m => m.idMeal !== id));
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (!user) {
        return (
            <div className="profile-empty">
                <div className="profile-empty-icon">🔒</div>
                <h2>Please sign in</h2>
                <p>You need to be logged in to view your profile.</p>
                <Link to="/login" className="profile-empty-btn">Sign In</Link>
            </div>
        );
    }

    const avatarLetter = user.username.charAt(0).toUpperCase();
    const joinDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    return (
        <div className="profile-page">
            {/* Header Banner */}
            <div className="profile-banner" />

            <div className="profile-content">

                {/* Avatar + Name */}
                <motion.div
                    className="profile-hero"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="profile-avatar-wrap">
                        <div className="profile-avatar">{avatarLetter}</div>
                    </div>
                    <div className="profile-hero-info">
                        <h1 className="profile-username">{user.username}</h1>
                        <p className="profile-joined">🗓 Member since {joinDate}</p>
                    </div>
                    <button className="profile-logout-btn" onClick={handleLogout}>
                        <LogOut size={16} /> Logout
                    </button>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    className="profile-stats"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-card">
                        <Heart size={22} className="stat-icon red" />
                        <span className="stat-val">{wishlist.length}</span>
                        <span className="stat-lbl">Wishlisted</span>
                    </div>
                    <div className="stat-card">
                        <ChefHat size={22} className="stat-icon orange" />
                        <span className="stat-val">{cooked.length}</span>
                        <span className="stat-lbl">Cooked</span>
                    </div>
                    <div className="stat-card">
                        <Star size={22} className="stat-icon yellow" />
                        <span className="stat-val">{reviewCount}</span>
                        <span className="stat-lbl">Reviews</span>
                    </div>
                    <div className="stat-card">
                        <UserIcon size={22} className="stat-icon blue" />
                        <span className="stat-val">Free</span>
                        <span className="stat-lbl">Plan</span>
                    </div>
                </motion.div>

                {/* Account Details */}
                <motion.div
                    className="profile-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <h2 className="section-heading">Account Details</h2>
                    <div className="detail-grid">
                        <div className="detail-row">
                            <span className="detail-lbl">Username</span>
                            <span className="detail-val">@{user.username}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-lbl">Email</span>
                            <span className="detail-val">{user.email || '—'}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-lbl">Preferences</span>
                            <span className="detail-val">{user.preferences || 'None set'}</span>
                        </div>
                    </div>
                </motion.div>

                {/* Wishlist Section */}
                <motion.div
                    className="profile-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="section-heading">
                        <Heart size={18} className="heading-icon red" /> My Wishlist
                    </h2>

                    {wishlist.length === 0 ? (
                        <div className="wishlist-empty">
                            <span>💔</span>
                            <p>No saved recipes yet. Search meals and heart your favourites!</p>
                            <Link to="/" className="wishlist-explore-btn">Explore Recipes</Link>
                        </div>
                    ) : (
                        <div className="wishlist-grid">
                            {wishlist.map((meal, i) => (
                                <motion.div
                                    key={meal.idMeal}
                                    className="wishlist-card"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.06 }}
                                >
                                    <img src={meal.strMealThumb} alt={meal.strMeal} />
                                    <div className="wishlist-info">
                                        <p className="wishlist-name">{meal.strMeal}</p>
                                        <p className="wishlist-meta">{meal.strCategory} · {meal.strArea}</p>
                                        <div className="wishlist-actions">
                                            <Link to={`/recipe/${meal.idMeal}`} className="wishlist-view-btn">View</Link>
                                            <button
                                                className="wishlist-remove-btn"
                                                onClick={() => removeFromWishlist(meal.idMeal)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
};

export default Profile;
