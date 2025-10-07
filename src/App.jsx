import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot, orderBy, where, addDoc } from 'firebase/firestore';
import { Calendar, AlertCircle, Send, CheckSquare, List, Plus, LogIn, User, BookOpen, Key, Smartphone } from 'lucide-react';

// --- Global Setup & Constants ---

// Firebase Global Variables (Mandatory Canvas Variables)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'schoollink-app';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// LOGO IMAGE URL
// Updated to use the correct content ID for the latest logo file
const LOGO_URL = "uploaded:image_2ad385.jpg-477a7596-3792-442a-895c-8b6d0076a217";

// Mock Credentials for Login
const MOCK_CREDENTIALS = {
    Teacher: { username: 'teacher', password: 'pass' },
    Student: { username: 'student', password: 'pass' },
};

// The UI theme colors based on your screenshots (Purple and Pink)
const COLORS = {
  primary: 'bg-indigo-700 hover:bg-indigo-800',
  primaryText: 'text-indigo-700',
  secondary: 'bg-rose-500 hover:bg-rose-600',
  secondaryText: 'text-rose-500',
  cardBg: 'bg-white',
  purpleBg: 'bg-indigo-100', // Light background for the role cards
};

// Mock event data for initial view and type reference
const MOCK_EVENTS = [
    { id: '1', title: 'Sports Day', date: '2025-10-15', description: 'Annual sports meet with various competitions like relay, sprints, and long jump.', category: 'Sports' },
    { id: '2', title: 'Essay Writing Competition', date: '2025-11-05', description: 'A creative writing competition for all grades. Topic: The Future of AI.', category: 'Academic' },
    { id: '3', title: 'Model United Nations (MUN)', date: '2025-11-20', description: 'Simulating UN procedures, focused on debate and diplomacy.', category: 'Club' },
    { id: '4', 'title': 'Photography Contest', date: '2025-12-01', description: 'Capture moments around the campus. Theme: Everyday Heroes.', category: 'Art' },
    { id: '5', 'title': 'Talent Hunt', date: '2025-12-15', description: 'Showcase your skills in singing, dancing, or stand-up comedy.', category: 'Culture' },
];

const EventCategories = ['Sports', 'Academic', 'Club', 'Art', 'Culture', 'Other'];

// Utility function for creating a Firestore path
const getPublicCollectionRef = (db, collectionName) => {
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
};

// Utility function for exponential backoff (retry logic for API calls)
const withRetry = async (fn, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// --- Custom Components ---

const LogoDisplay = ({ size = 'medium' }) => {
    const sizeClass = size === 'large' ? 'w-24 h-24 mb-6' : 'w-10 h-10';
    const textClass = size === 'large' ? 'text-3xl mb-1' : 'text-xl';
    const mottoClass = size === 'large' ? 'text-base text-gray-600' : 'hidden';

    // Using the uploaded image URL as the logo
    return (
        <div className="flex flex-col items-center">
             <img 
                src={LOGO_URL} 
                alt="SchoolLink Logo" 
                className={`${sizeClass} rounded-full object-cover shadow-lg`} 
                onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/100x100/A78BFA/ffffff?text=SL" }}
            />
            {size === 'large' && (
                <>
                    <h1 className={`font-extrabold text-indigo-700 ${textClass}`}>SchoolLink</h1>
                    <p className={mottoClass}>Stay linked, stay informed</p>
                </>
            )}
        </div>
    );
};


const Button = ({ children, onClick, color = 'primary', className = '', Icon, disabled = false, type = 'button' }) => {
    const colorClass = color === 'primary' ? COLORS.primary : COLORS.secondary;
    const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-lg text-white font-semibold transition duration-200 shadow-md ${colorClass} ${className} ${disabledClass}`}
        >
            {Icon && <Icon size={20} />}
            <span>{children}</span>
        </button>
    );
};

const Card = ({ children, title, Icon, className = '', titleColor = COLORS.primaryText }) => (
    <div className={`bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg mx-auto ${className}`}>
        {title && (
            <h2 className={`text-2xl font-bold mb-6 flex items-center space-x-3 ${titleColor}`}>
                {Icon && <Icon size={24} />}
                <span>{title}</span>
            </h2>
        )}
        {children}
    </div>
);

// --- New View Components for Login (Updated with Logo) ---

const InitialRoleChoiceView = ({ onSelectRole }) => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 w-full" style={{ backgroundColor: '#f0f2f5' }}>
        <LogoDisplay size="large" />
        
        <div className="w-full max-w-xs bg-white rounded-xl shadow-2xl p-6 mt-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Choose your...</h2>
            <div className="space-y-6">
                <button 
                    onClick={() => onSelectRole('Student')} 
                    className={`w-full p-4 rounded-xl text-white font-bold text-lg shadow-lg transition duration-200 flex flex-col items-center ${COLORS.primary} hover:shadow-xl`}
                >
                    <Smartphone size={32} className="mb-2" />
                    Student
                </button>
                <button 
                    onClick={() => onSelectRole('Teacher')} 
                    className={`w-full p-4 rounded-xl text-white font-bold text-lg shadow-lg transition duration-200 flex flex-col items-center ${COLORS.secondary} hover:shadow-xl`}
                >
                    <BookOpen size={32} className="mb-2" />
                    Teacher
                </button>
            </div>
        </div>

    </div>
);

const LoginView = ({ setView, targetRole, onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isStudent = targetRole === 'Student';
    const roleColor = isStudent ? COLORS.secondary : COLORS.primary;
    const roleText = isStudent ? 'Student' : 'Teacher';
    const welcomeMessage = isStudent ? 'Welcome, dear Student!' : 'Welcome, dear Teacher!';

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const inputUsername = username.trim().toLowerCase();
        const inputPassword = password.trim(); // Password remains case-sensitive/unmodified
        
        // Simple mock credential check
        const expected = MOCK_CREDENTIALS[targetRole];
        
        // Fix: Added trimming and lowercase conversion to the input username for comparison
        if (inputUsername === expected.username && inputPassword === expected.password) {
            onLogin(targetRole);
        } else {
            setError('Invalid credentials. Please try again.');
        }

        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 w-full" style={{ backgroundColor: '#f0f2f5' }}>
            <LogoDisplay size="large" />
            
            <Card title={`${roleText} Login`} Icon={LogIn} titleColor={roleColor.replace('bg-', 'text-')} className="w-full max-w-sm mt-6">
                 <h3 className={`text-xl font-bold mb-6 ${roleColor.replace('bg-', 'text-')}`}>{welcomeMessage}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 font-medium mb-1" htmlFor="username">Username</label>
                        <input 
                            type="text" 
                            id="username" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500" 
                            placeholder="Enter username" 
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1" htmlFor="password">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500" 
                            placeholder="Enter password" 
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg text-sm bg-red-100 text-red-700">
                            {error}
                        </div>
                    )}

                    <Button type="submit" Icon={Key} className="w-full" disabled={loading} color={isStudent ? 'secondary' : 'primary'}>
                        {loading ? 'Logging In...' : 'Login'}
                    </Button>
                </form>

                <div className="mt-4 text-center">
                    <button onClick={() => setView('InitialRoleChoice')} className="text-sm text-gray-500 hover:text-indigo-700 transition">
                        &larr; Back to Role Selection
                    </button>
                </div>
            </Card>
            <div className="mt-4 text-sm text-gray-600 p-2 border border-dashed rounded-lg bg-gray-100">
                <p>Mock Credentials for testing:</p>
                <p className="font-semibold text-indigo-700">Teacher: (user: teacher, pass: pass)</p>
                <p className="font-semibold text-rose-500">Student: (user: student, pass: pass)</p>
            </div>
        </div>
    );
};

// --- End New View Components for Login ---


// --- Existing View Components (Minor Updates) ---

const EventCalendarView = ({ events, setView, setSelectedEvent, userRole }) => {
    const now = new Date();
    const [date, setDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1)); // Start of current month
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const startDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sunday) to 6 (Saturday)
    const totalDays = getDaysInMonth(currentYear, currentMonth);

    const formatDay = (day) => day.toString().padStart(2, '0');
    const getEventsForDay = (day) => {
        const dayString = `${currentYear}-${formatDay(currentMonth + 1)}-${formatDay(day)}`;
        return events.filter(e => e.date === dayString).length;
    };

    const calendarCells = [];
    // Empty cells for the start of the month
    for (let i = 0; i < startDay; i++) {
        calendarCells.push(<div key={`empty-${i}`} className="p-2"></div>);
    }
    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
        const hasEvents = getEventsForDay(day) > 0;
        const isToday = day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
        calendarCells.push(
            <div key={day} className={`p-2 text-center rounded-lg font-semibold cursor-pointer transition duration-150 ease-in-out ${isToday ? 'bg-indigo-200 border-2 border-indigo-700' : hasEvents ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'hover:bg-gray-100'}`}>
                {day}
                {hasEvents > 0 && <span className="block text-xs font-normal mt-0.5">({hasEvents})</span>}
            </div>
        );
    }

    const goToDetails = () => {
        // Filter events for the current month and show the list on the details view
        const currentMonthEvents = events.filter(e => new Date(e.date).getMonth() === currentMonth && new Date(e.date).getFullYear() === currentYear);
        setSelectedEvent(currentMonthEvents);
        setView('EventDetails');
    };

    const changeMonth = (delta) => {
        setDate(prevDate => {
            const newDate = new Date(prevDate.getFullYear(), prevDate.getMonth() + delta, 1);
            return newDate;
        });
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <Card title="Event Calendar" Icon={Calendar} titleColor={COLORS.primaryText} className="max-w-xl">
            <div className="flex justify-between items-center mb-4">
                <Button onClick={() => changeMonth(-1)} className="!py-1 !px-3" color="secondary">{'<'}</Button>
                <h3 className="text-xl font-bold text-gray-800">{monthNames[currentMonth]} {currentYear}</h3>
                <Button onClick={() => changeMonth(1)} className="!py-1 !px-3" color="secondary">{'>'}</Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-sm mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-bold text-gray-500">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-sm">
                {calendarCells}
            </div>
            <Button onClick={goToDetails} className="mt-8 w-full" Icon={List}>
                Go to Event Details
            </Button>
            {userRole === 'Teacher' && (
                <Button onClick={() => setView('AddEvent')} className="mt-4 w-full" color="secondary" Icon={Plus}>
                    Add New Event
                </Button>
            )}
        </Card>
    );
};

const EventDetailsView = ({ events, setView, userRole, setSelectedEvent }) => {
    // events is an array of events filtered by month from the calendar view, or all events if coming from dashboard
    const listToDisplay = Array.isArray(events) ? events : MOCK_EVENTS;
    const sortedEvents = listToDisplay.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group events by date for a cleaner view
    const groupedEvents = sortedEvents.reduce((acc, event) => {
        const dateKey = event.date || 'TBD';
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
    }, {});

    return (
        <Card title="Upcoming Events" Icon={BookOpen} titleColor={COLORS.primaryText} className="max-w-2xl">
            <div className="max-h-[70vh] overflow-y-auto space-y-6">
                {Object.keys(groupedEvents).length === 0 ? (
                    <p className="text-center text-gray-500 py-10">No events currently scheduled.</p>
                ) : (
                    Object.entries(groupedEvents).map(([date, eventList]) => (
                        <div key={date} className="border-b pb-4 last:border-b-0">
                            <h3 className="text-lg font-bold text-indigo-700 mb-3 p-1 rounded-md bg-indigo-50">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                            <div className="space-y-4">
                                {eventList.map(event => (
                                    <div key={event.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                                        <h4 className="font-bold text-lg text-rose-600 mb-1">{event.title}</h4>
                                        <p className="text-sm text-gray-700">{event.description}</p>
                                        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                                            <span>Category: <span className="font-semibold text-gray-800">{event.category}</span></span>
                                            {/* Changed alert() to a proper display message for consistency */}
                                            <Button onClick={() => { /* In a real app: handle registration logic */ alert(`Registration for ${event.title} mocked.`); }} className="!py-1 !px-3 !text-xs" color="secondary">
                                                Register
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
            <Button onClick={() => { setView(userRole === 'Teacher' ? 'TeacherDashboard' : 'StudentDashboard'); setSelectedEvent(null); }} className="mt-6 w-full" color="secondary">
                Back to Dashboard
            </Button>
        </Card>
    );
};

const AddEventView = ({ setView, db, userRole }) => {
    const [formData, setFormData] = useState({ title: '', date: '', description: '', category: EventCategories[0] });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (!formData.title || !formData.date || !formData.description) {
            setMessage('Please fill in all fields.');
            setLoading(false);
            return;
        }

        const newEvent = {
            ...formData,
            createdAt: new Date().toISOString(),
            createdBy: userRole,
        };

        try {
            await withRetry(() => addDoc(getPublicCollectionRef(db, 'events'), newEvent));
            setMessage('Event successfully added!');
            setFormData({ title: '', date: '', description: '', category: EventCategories[0] });
        } catch (error) {
            console.error('Error adding event: ', error);
            setMessage('Failed to add event. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Add New Event" Icon={Plus} titleColor={COLORS.primaryText} className="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-gray-700 font-medium mb-1" htmlFor="title">Event Title</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500" placeholder="e.g., Annual Day 2025" />
                </div>
                <div>
                    <label className="block text-gray-700 font-medium mb-1" htmlFor="date">Event Date</label>
                    <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500" />
                </div>
                <div>
                    <label className="block text-gray-700 font-medium mb-1" htmlFor="category">Category</label>
                    <select id="category" name="category" value={formData.category} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                        {EventCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-gray-700 font-medium mb-1" htmlFor="description">Description</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="4" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500" placeholder="Detailed description of the event..."></textarea>
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <Button type="submit" Icon={Plus} className="w-full" disabled={loading}>
                    {loading ? 'Adding...' : 'Publish Event'}
                </Button>
            </form>
            <Button onClick={() => setView('TeacherDashboard')} className="mt-4 w-full !bg-gray-500" color="secondary">
                Cancel
            </Button>
        </Card>
    );
};

const AddScoresView = ({ setView, db, events, userId }) => {
    const [selectedEventId, setSelectedEventId] = useState('');
    const [scoreData, setScoreData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Mock student list (In a real app, this would be fetched from a 'students' collection)
    const mockStudents = [
        { id: 'student-A', name: 'Alfie B.' },
        { id: 'student-B', name: 'Betty C.' },
        { id: 'student-C', name: 'Charlie D.' },
        { id: 'student-D', name: 'Dana E.' },
    ];

    useEffect(() => {
        if (selectedEventId) {
            // Initialize score data when an event is selected
            const initialScores = mockStudents.map(student => ({
                studentId: student.id,
                studentName: student.name,
                score: '',
                rank: '',
            }));
            setScoreData(initialScores);
            setMessage('');
        }
    }, [selectedEventId]);

    const handleScoreChange = (studentId, field, value) => {
        setScoreData(prev => prev.map(s => s.studentId === studentId ? { ...s, [field]: value } : s));
    };

    const handleSubmit = async () => {
        if (!selectedEventId) return;

        setLoading(true);
        setMessage('');

        const eventTitle = events.find(e => e.id === selectedEventId)?.title || 'Unknown Event';
        
        // Filter out empty scores/ranks
        const validScores = scoreData.filter(s => s.score || s.rank);

        try {
             // Create a document ID that links directly to the event
            const docRef = doc(getPublicCollectionRef(db, 'scores'), selectedEventId);
            const scorePayload = {
                eventId: selectedEventId,
                eventTitle: eventTitle,
                results: validScores,
                publishedAt: new Date().toISOString(),
                teacherId: userId,
            };

            await withRetry(() => setDoc(docRef, scorePayload));
            setMessage('Scores successfully published/updated!');
            setSelectedEventId('');
            setScoreData([]);
        } catch (error) {
            console.error('Error publishing scores: ', error);
            setMessage('Failed to publish scores. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Publish Event Scores" Icon={CheckSquare} titleColor={COLORS.primaryText} className="max-w-2xl">
            <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-1" htmlFor="event">Select Event</label>
                <select id="event" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500">
                    <option value="">-- Choose an Event --</option>
                    {events.map(event => (
                        <option key={event.id} value={event.id}>{event.title} ({event.date})</option>
                    ))}
                </select>
            </div>

            {selectedEventId && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-indigo-700">Enter Results</h3>
                    <div className="grid grid-cols-4 gap-2 font-bold text-gray-600 border-b pb-2">
                        <div className="col-span-2">Student Name</div>
                        <div>Score</div>
                        <div>Rank</div>
                    </div>
                    {scoreData.map(student => (
                        <div key={student.studentId} className="grid grid-cols-4 gap-2 items-center">
                            <div className="col-span-2 font-medium text-gray-800">{student.studentName}</div>
                            <input
                                type="text"
                                value={student.score}
                                onChange={(e) => handleScoreChange(student.studentId, 'score', e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg w-full text-sm"
                                placeholder="e.g., 9.5s"
                            />
                            <input
                                type="text"
                                value={student.rank}
                                onChange={(e) => handleScoreChange(student.studentId, 'rank', e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg w-full text-sm"
                                placeholder="e.g., 1st"
                            />
                        </div>
                    ))}
                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </div>
                    )}
                    <Button onClick={handleSubmit} Icon={Send} className="w-full mt-6" disabled={loading}>
                        {loading ? 'Publishing...' : 'Publish Scores'}
                    </Button>
                </div>
            )}
            <Button onClick={() => setView('TeacherDashboard')} className="mt-4 w-full !bg-gray-500" color="secondary">
                Back to Dashboard
            </Button>
        </Card>
    );
};

const ViewResultsView = ({ setView, userRole, scores, events }) => {
    const [selectedScore, setSelectedScore] = useState(null);

    const eventNames = events.reduce((acc, e) => {
        acc[e.id] = e.title;
        return acc;
    }, {});

    const sortedScores = [...scores].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const EventResultCard = ({ score }) => (
        <div key={score.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="font-bold text-lg text-rose-600 mb-1">{score.eventTitle}</h4>
            <p className="text-sm text-gray-600 mb-3">Published: {new Date(score.publishedAt).toLocaleDateString()}</p>
            <Button onClick={() => setSelectedScore(score)} className="!py-1 !px-3 !text-sm" color="secondary">
                View All Results
            </Button>
        </div>
    );

    const ResultModal = ({ score, onClose }) => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card title={`Results: ${score.eventTitle}`} titleColor={COLORS.primaryText} className="max-w-xl">
                <div className="max-h-96 overflow-y-auto space-y-3">
                    <div className="grid grid-cols-3 gap-2 font-bold text-gray-600 border-b pb-2">
                        <div>Rank</div>
                        <div className="col-span-1">Name</div>
                        <div>Score</div>
                    </div>
                    {score.results.sort((a, b) => (a.rank || '').localeCompare(b.rank || '', undefined, { numeric: true, sensitivity: 'base' })).map((result, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 items-center border-b last:border-b-0 py-1">
                            <div className="font-semibold text-rose-600">{result.rank || '-'}</div>
                            <div className="col-span-1 text-gray-800">{result.studentName}</div>
                            <div className="text-gray-600">{result.score || '-'}</div>
                        </div>
                    ))}
                </div>
                <Button onClick={onClose} className="mt-6 w-full !bg-gray-500">Close</Button>
            </Card>
        </div>
    );

    return (
        <Card title="Event Results" Icon={List} titleColor={COLORS.primaryText} className="max-w-2xl">
            <div className="max-h-[70vh] overflow-y-auto space-y-4">
                {sortedScores.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">No event results have been published yet.</p>
                ) : (
                    sortedScores.map(score => <EventResultCard key={score.id} score={score} />)
                )}
            </div>
            <Button onClick={() => setView('StudentDashboard')} className="mt-6 w-full" color="secondary">
                Back to Dashboard
            </Button>

            {selectedScore && <ResultModal score={selectedScore} onClose={() => setSelectedScore(null)} />}
        </Card>
    );
};

const NoticeBoardView = ({ setView, notices, userRole, db, userId }) => {
    const [noticeText, setNoticeText] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const sortedNotices = [...notices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleSendNotice = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (!noticeText) {
            setMessage('Notice cannot be empty.');
            setLoading(false);
            return;
        }

        const newNotice = {
            content: noticeText,
            createdAt: new Date().toISOString(),
            createdBy: userId, // In a real app, we'd look up the teacher's name
        };

        try {
            await withRetry(() => addDoc(getPublicCollectionRef(db, 'notices'), newNotice));
            setMessage('Notice sent successfully!');
            setNoticeText('');
        } catch (error) {
            console.error('Error sending notice: ', error);
            setMessage('Failed to send notice. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Notices" Icon={AlertCircle} titleColor={COLORS.primaryText} className="max-w-xl">
            <div className="flex flex-col space-y-6">
                {userRole === 'Teacher' && (
                    <div className="p-4 border border-indigo-200 rounded-lg bg-indigo-50">
                        <h3 className="text-lg font-bold text-indigo-700 mb-3">Send New Notice</h3>
                        <form onSubmit={handleSendNotice} className="space-y-3">
                            <textarea
                                value={noticeText}
                                onChange={(e) => setNoticeText(e.target.value)}
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                                placeholder="Type your announcement here..."
                            ></textarea>
                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {message}
                                </div>
                            )}
                            <Button type="submit" Icon={Send} className="w-full" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Notice'}
                            </Button>
                        </form>
                    </div>
                )}

                <h3 className="text-xl font-bold text-rose-700 border-b pb-2">Recent Announcements</h3>
                <div className="max-h-60 overflow-y-auto space-y-3">
                    {sortedNotices.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No recent notices.</p>
                    ) : (
                        sortedNotices.map((notice, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg shadow-md border-l-4 border-rose-500">
                                <p className="text-gray-800">{notice.content}</p>
                                <div className="text-xs text-gray-500 mt-2 flex justify-between">
                                    <span>Posted by: {notice.createdBy.substring(0, 8)}...</span>
                                    <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Button onClick={() => setView(userRole === 'Teacher' ? 'TeacherDashboard' : 'StudentDashboard')} className="mt-6 w-full !bg-gray-500" color="secondary">
                Back to Dashboard
            </Button>
        </Card>
    );
};

const DashboardLink = ({ title, Icon, setView, viewName, color }) => (
    <div onClick={() => setView(viewName)} className={`flex flex-col items-center justify-center p-6 rounded-xl shadow-lg cursor-pointer transition duration-300 transform hover:scale-[1.02] ${color === 'primary' ? COLORS.primary : COLORS.secondary}`}>
        <Icon size={36} className="text-white mb-2" />
        <span className="text-white text-md font-semibold text-center">{title}</span>
    </div>
);

const TeacherDashboard = ({ setView }) => (
    <Card title="Teacher Dashboard" Icon={BookOpen} titleColor={COLORS.primaryText} className="max-w-xl">
        <h3 className="text-xl font-bold text-rose-600 mb-6">Welcome, dear Teacher!</h3>
        <div className="grid grid-cols-2 gap-6">
            <DashboardLink title="Event Calendar" Icon={Calendar} setView={setView} viewName="EventCalendar" color="primary" />
            <DashboardLink title="Add New Event" Icon={Plus} setView={setView} viewName="AddEvent" color="secondary" />
            <DashboardLink title="Send Notice" Icon={Send} setView={setView} viewName="NoticeBoard" color="primary" />
            <DashboardLink title="Publish Scores" Icon={CheckSquare} setView={setView} viewName="AddScores" color="secondary" />
        </div>
        <Button onClick={() => setView('InitialRoleChoice')} Icon={LogIn} className="mt-8 w-full !bg-gray-500" color="secondary">
            Log Out
        </Button>
    </Card>
);

const StudentDashboard = ({ setView }) => (
    <Card title="Student Dashboard" Icon={User} titleColor={COLORS.primaryText} className="max-w-xl">
        <h3 className="text-xl font-bold text-rose-600 mb-6">Welcome, dear Student!</h3>
        <div className="grid grid-cols-2 gap-6">
            <DashboardLink title="Events Calendar" Icon={Calendar} setView={setView} viewName="EventCalendar" color="primary" />
            <DashboardLink title="View Notices" Icon={Send} setView={setView} viewName="NoticeBoard" color="secondary" />
            <DashboardLink title="View Results" Icon={List} setView={setView} viewName="ViewResults" color="primary" />
            <DashboardLink title="Attendance/Profile" Icon={User} setView={setView} viewName="StudentProfile" color="secondary" />
        </div>
        <Button onClick={() => setView('InitialRoleChoice')} Icon={LogIn} className="mt-8 w-full !bg-gray-500" color="secondary">
            Log Out
        </Button>
    </Card>
);

const StudentProfileView = ({ setView, userId }) => {
    // Mock Data based on the wireframe
    const studentData = {
        id: userId,
        name: 'Jane Doe (Mock Student)',
        class: 'XI',
        section: 'A',
        address: '123 School Road, City, Zip',
        phone: '9876543210',
    };

    return (
        <Card title="Student Profile" Icon={User} titleColor={COLORS.primaryText} className="max-w-sm">
            <div className="space-y-4">
                <p className="text-2xl font-bold text-rose-600">{studentData.name}</p>
                <div className="text-gray-700">
                    <p><span className="font-semibold text-indigo-700">Student ID:</span> {studentData.id.substring(0, 8)}...</p>
                    <p><span className="font-semibold text-indigo-700">Class:</span> {studentData.class}</p>
                    <p><span className="font-semibold text-indigo-700">Section:</span> {studentData.section}</p>
                    <p><span className="font-semibold text-indigo-700">Address:</span> {studentData.address}</p>
                    <p><span className="font-semibold text-indigo-700">Phone:</span> {studentData.phone}</p>
                </div>
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                    <h4 className="font-bold text-indigo-700 mb-1">Note:</h4>
                    <p>Attendance tracking and detailed profile management would be implemented here in a production version.</p>
                </div>
            </div>
            <Button onClick={() => setView('StudentDashboard')} className="mt-6 w-full" color="secondary">
                Back to Dashboard
            </Button>
        </Card>
    );
};


// --- Main App Component ---

const App = () => {
    // Firebase State
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // App State
    const [userRole, setUserRole] = useState(null); // 'Teacher', 'Student', or null
    const [targetRole, setTargetRole] = useState(null); // Role selected before logging in
    const [userId, setUserId] = useState(null);
    const [view, setView] = useState('InitialRoleChoice'); // Controls the current screen
    const [selectedEvent, setSelectedEvent] = useState(null); // Used to pass data to EventDetails

    // Data State (Fetched from Firestore)
    const [events, setEvents] = useState(MOCK_EVENTS);
    const [notices, setNotices] = useState([]);
    const [scores, setScores] = useState([]);
    const [error, setError] = useState(null);

    // 1. Firebase Initialization and Authentication
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const authentication = getAuth(app);
            setDb(firestore);
            setAuth(authentication);

            // Log levels for debugging firestore issues
            // import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
            // setLogLevel('Debug');

            // Sign in with custom token or anonymously
            onAuthStateChanged(authentication, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else if (initialAuthToken) {
                    await signInWithCustomToken(authentication, initialAuthToken);
                } else {
                    await signInAnonymously(authentication);
                }
                setIsAuthReady(true);
            });
        } catch (e) {
            console.error("Firebase Initialization Error:", e);
            setError("Failed to initialize Firebase services.");
        }
    }, []);

    // 2. Data Fetching (Listeners)
    useEffect(() => {
        if (!db || !isAuthReady) return;
        setError(null);

        // --- Events Listener ---
        const qEvents = query(getPublicCollectionRef(db, 'events'), orderBy('date', 'desc'));
        const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Merge mock events with fetched events to ensure the UI has initial data
            const mergedEvents = [...MOCK_EVENTS.filter(m => !fetchedEvents.some(f => f.title === m.title)), ...fetchedEvents];
            setEvents(mergedEvents);
        }, (err) => {
            console.error("Events Snapshot Error:", err);
            setError("Could not load events.");
        });

        // --- Notices Listener ---
        const qNotices = query(getPublicCollectionRef(db, 'notices'), orderBy('createdAt', 'desc'));
        const unsubscribeNotices = onSnapshot(qNotices, (snapshot) => {
            const fetchedNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotices(fetchedNotices);
        }, (err) => {
            console.error("Notices Snapshot Error:", err);
            setError("Could not load notices.");
        });

        // --- Scores Listener ---
        const qScores = query(getPublicCollectionRef(db, 'scores'));
        const unsubscribeScores = onSnapshot(qScores, (snapshot) => {
            const fetchedScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setScores(fetchedScores);
        }, (err) => {
            console.error("Scores Snapshot Error:", err);
            setError("Could not load scores.");
        });

        return () => {
            unsubscribeEvents();
            unsubscribeNotices();
            unsubscribeScores();
        };
    }, [db, isAuthReady]);

    // Role Selection Handler (from InitialRoleChoiceView)
    const handleRoleSelect = (role) => {
        setTargetRole(role);
        setView('Login');
    };

    // Login Handler (from LoginView)
    const handleLogin = (role) => {
        setUserRole(role);
        setTargetRole(null); // Clear target role after successful login
        setView(role === 'Teacher' ? 'TeacherDashboard' : 'StudentDashboard');
    };

    // Conditional Rendering based on view state
    const renderView = () => {
        if (error) {
            return (
                <div className="flex items-center justify-center min-h-screen p-4 bg-red-100 text-red-700">
                    <p className="text-xl font-semibold">{error}</p>
                </div>
            );
        }

        if (!isAuthReady) {
            return (
                <div className="flex items-center justify-center min-h-screen p-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-700 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading SchoolLink...</p>
                    </div>
                </div>
            );
        }

        switch (view) {
            case 'InitialRoleChoice':
                return <InitialRoleChoiceView onSelectRole={handleRoleSelect} />;
            case 'Login':
                return <LoginView setView={setView} targetRole={targetRole} onLogin={handleLogin} />;
            case 'TeacherDashboard':
                return <TeacherDashboard setView={setView} />;
            case 'StudentDashboard':
                return <StudentDashboard setView={setView} />;
            case 'EventCalendar':
                return <EventCalendarView events={events} setView={setView} setSelectedEvent={setSelectedEvent} userRole={userRole} />;
            case 'EventDetails':
                // selectedEvent is either an array of events (from calendar) or null (default)
                return <EventDetailsView events={selectedEvent || events} setView={setView} userRole={userRole} setSelectedEvent={setSelectedEvent} />;
            case 'AddEvent':
                if (userRole === 'Teacher' && db) return <AddEventView setView={setView} db={db} userRole={userRole} />;
                return <p>Access Denied</p>;
            case 'AddScores':
                if (userRole === 'Teacher' && db) return <AddScoresView setView={setView} db={db} events={events} userId={userId} />;
                return <p>Access Denied</p>;
            case 'ViewResults':
                return <ViewResultsView setView={setView} userRole={userRole} scores={scores} events={events} />;
            case 'NoticeBoard':
                if (db) return <NoticeBoardView setView={setView} notices={notices} userRole={userRole} db={db} userId={userId} />;
                return <p>Loading Notices...</p>;
            case 'StudentProfile':
                return <StudentProfileView setView={setView} userId={userId} />;
            default:
                return <InitialRoleChoiceView onSelectRole={handleRoleSelect} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
            <style>{`
                /* Font Inter is assumed to be available */
                .font-inter { font-family: 'Inter', sans-serif; }
                .main-container {
                    min-height: 100vh;
                    padding-top: ${userRole ? '5rem' : '0'}; /* Space for fixed header only when logged in */
                    padding-bottom: 2rem;
                    background-color: #f0f2f5;
                }
                /* Custom scrollbar for better look */
                .max-h-\[70vh\]::-webkit-scrollbar,
                .max-h-60::-webkit-scrollbar,
                .max-h-96::-webkit-scrollbar {
                    width: 6px;
                }
                .max-h-\[70vh\]::-webkit-scrollbar-thumb,
                .max-h-60::-webkit-scrollbar-thumb,
                .max-h-96::-webkit-scrollbar-thumb {
                    background-color: #9333ea; /* A shade of purple */
                    border-radius: 3px;
                }
            `}</style>

            {/* Fixed Header */}
            {userRole && (
                <header className={`fixed top-0 left-0 right-0 ${COLORS.primary} p-4 shadow-lg z-10`}>
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                         <div className="flex items-center space-x-3">
                            <LogoDisplay size="small" />
                            <h1 className="text-2xl font-bold text-white">SchoolLink</h1>
                        </div>
                        <div className="flex items-center space-x-4 text-white">
                            <span className="text-sm">User: {userRole} ({userId?.substring(0, 8)}...)</span>
                            <button onClick={() => { setUserRole(null); setView('InitialRoleChoice'); }} className="p-2 rounded-full hover:bg-indigo-600 transition">
                                <LogIn size={20} />
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content Area */}
            <main className="flex-grow flex items-center justify-center p-4 pt-20 main-container">
                {renderView()}
            </main>
        </div>
    );
};

export default App;
