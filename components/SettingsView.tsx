import React, { useState, useEffect } from 'react';
import { Save, Database, Key } from 'lucide-react';
import { getStoredServerKey, setStoredServerKey } from '../services/fcmService';
import { seedDatabase } from '../services/dataService';

export const SettingsView: React.FC = () => {
  const [serverKey, setServerKey] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    setServerKey(getStoredServerKey());
  }, []);

  const handleSaveKey = () => {
    setStoredServerKey(serverKey);
    alert('Server Key saved successfully!');
  };

  const handleSeed = async () => {
    if (confirm("This will overwrite/add mock students to your Firestore 'students' collection. Continue?")) {
      setIsSeeding(true);
      try {
        await seedDatabase();
        alert('Database seeded successfully! Please refresh the page to see changes in the Dashboard/Attendance views.');
      } catch (e) {
        alert('Error seeding database. Check console.');
        console.error(e);
      } finally {
        setIsSeeding(false);
      }
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-8">
        
        {/* Server Key Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            Firebase Cloud Messaging (FCM)
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Enter your Firebase Project <strong>Server Key</strong> to enable real push notifications. 
            You can find this in Firebase Console {'>'} Project Settings {'>'} Cloud Messaging.
          </p>
          
          <div className="flex gap-3">
            <input 
              type="password" 
              value={serverKey}
              onChange={(e) => setServerKey(e.target.value)}
              placeholder="Enter Legacy Server Key (e.g. AizaSy...)"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              onClick={handleSaveKey}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Key
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Note: Without this key, the app will simulate notifications (Mock mode).
          </p>
        </div>

        <div className="border-t border-gray-100"></div>

        {/* Database Section */}
        <div>
           <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            Database Management
          </h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Initialize your Firestore database with sample student data for testing purposes.
          </p>
          
          <button 
            onClick={handleSeed}
            disabled={isSeeding}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition flex items-center gap-2 border border-gray-300"
          >
            <Database className={`w-4 h-4 ${isSeeding ? 'animate-pulse' : ''}`} />
            {isSeeding ? 'Seeding...' : 'Seed Mock Data to Firestore'}
          </button>
        </div>
        
      </div>
    </div>
  );
};