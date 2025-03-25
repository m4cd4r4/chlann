import React, { useState } from 'react';
import { Camera, Image, Video, Search, Settings, MessageSquare, Phone, X, Upload, Check, ArrowLeft, MoreVertical, Mic, Plus, Calendar, Clock, User, MapPin, Mail, BellRing, Archive, Lock, Shield, CloudRain, Sun } from 'lucide-react';

const AppPreview = () => {
  const [activeTab, setActiveTab] = useState('messages');
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  
  return (
    <div className="flex flex-col items-center h-full w-full bg-gray-100 p-6">
      <h2 className="text-xl font-bold mb-4">High-Resolution Messenger UI Components</h2>
      
      {showMediaViewer ? (
        <MediaViewer onClose={() => setShowMediaViewer(false)} />
      ) : (
        <>
          <div className="w-full max-w-md mb-8">
            <div className="flex justify-between mb-3">
              <div className="text-lg font-semibold">Screen Preview</div>
              <div className="text-blue-500">Device: iPhone 13</div>
            </div>
            
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-300">
              {/* Status Bar */}
              <div className="bg-black text-white px-4 py-1 flex justify-between text-xs">
                <span>9:41 AM</span>
                <span>🔋 100%</span>
              </div>
              
              {/* Active Screen */}
              <div className="h-96 overflow-y-auto">
                {activeTab === 'messages' && <ConversationList onMediaClick={() => setShowMediaViewer(true)} />}
                {activeTab === 'calls' && <CallsScreen />}
                {activeTab === 'camera' && <CameraScreen />}
                {activeTab === 'media' && <MediaGalleryScreen onMediaClick={() => setShowMediaViewer(true)} />}
                {activeTab === 'settings' && <SettingsScreen />}
              </div>
              
              {/* Tab Bar */}
              <div className="flex justify-between items-center px-6 py-3 bg-white border-t border-gray-200">
                <TabButton 
                  icon={<MessageSquare size={24} />} 
                  label="Chats" 
                  active={activeTab === 'messages'} 
                  onClick={() => setActiveTab('messages')} 
                />
                <TabButton 
                  icon={<Phone size={24} />} 
                  label="Calls" 
                  active={activeTab === 'calls'} 
                  onClick={() => setActiveTab('calls')} 
                />
                <TabButton 
                  icon={<Camera size={24} />} 
                  label="Camera" 
                  active={activeTab === 'camera'} 
                  onClick={() => setActiveTab('camera')} 
                />
                <TabButton 
                  icon={<Image size={24} />} 
                  label="Media" 
                  active={activeTab === 'media'} 
                  onClick={() => setActiveTab('media')} 
                />
                <TabButton 
                  icon={<Settings size={24} />} 
                  label="Settings" 
                  active={activeTab === 'settings'} 
                  onClick={() => setActiveTab('settings')} 
                />
              </div>
            </div>
          </div>
          
          <ComponentShowcase />
        </>
      )}
    </div>
  );
};

const TabButton = ({ icon, label, active, onClick }) => {
  return (
    <button 
      className={`flex flex-col items-center justify-center ${active ? 'text-blue-500' : 'text-gray-500'}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
};

const ConversationList = ({ onMediaClick }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold">Messages</h1>
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
          <User size={18} />
        </div>
      </div>
      
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center">
          <Search size={16} className="text-gray-500 mr-2" />
          <span className="text-gray-500 text-sm">Search conversations</span>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-grow">
        <ConversationItem 
          name="Sarah Parker"
          message="I've sent you the high-res photos from yesterday"
          time="12:45 PM"
          unread={3}
          hasMedia={true}
          onMediaClick={onMediaClick}
        />
        <ConversationItem 
          name="Photography Group"
          message="David: Check out this new lens I bought"
          time="10:30 AM"
          unread={0}
          hasMedia={true}
          avatar="https://api.placeholder/32/32"
          onMediaClick={onMediaClick}
        />
        <ConversationItem 
          name="John Smith"
          message="Are we still meeting at 5?"
          time="Yesterday"
          unread={0}
          hasMedia={false}
        />
        <ConversationItem 
          name="Design Team"
          message="Emma: Here's the final version of the logo"
          time="Yesterday"
          unread={0}
          hasMedia={true}
          onMediaClick={onMediaClick}
        />
        <ConversationItem 
          name="Mom"
          message="Call me when you get a chance"
          time="Tuesday"
          unread={0}
          hasMedia={false}
        />
      </div>
    </div>
  );
};

const ConversationItem = ({ name, message, time, unread, hasMedia, avatar, onMediaClick }) => {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50">
      <div className="w-12 h-12 rounded-full bg-blue-100 mr-3 flex items-center justify-center text-blue-500 font-bold">
        {avatar ? <img src={avatar} className="w-full h-full rounded-full" alt={name} /> : name.charAt(0)}
      </div>
      <div className="flex-grow">
        <div className="flex justify-between">
          <span className="font-semibold">{name}</span>
          <span className="text-xs text-gray-500">{time}</span>
        </div>
        {hasMedia ? (
          <div className="flex items-center" onClick={onMediaClick}>
            <Image size={14} className="text-blue-500 mr-1" />
            <span className="text-sm text-gray-600 truncate">{message}</span>
          </div>
        ) : (
          <span className="text-sm text-gray-600 truncate">{message}</span>
        )}
      </div>
      {unread > 0 && (
        <div className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unread}
        </div>
      )}
    </div>
  );
};

const MediaGalleryScreen = ({ onMediaClick }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold">Media Gallery</h1>
        <Search size={20} className="text-gray-600" />
      </div>
      
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="flex justify-between bg-gray-100 rounded-lg p-1">
          <button className="py-1 px-3 bg-white rounded-md shadow-sm text-sm font-medium">All</button>
          <button className="py-1 px-3 text-sm font-medium text-gray-600">Images</button>
          <button className="py-1 px-3 text-sm font-medium text-gray-600">Videos</button>
          <button className="py-1 px-3 text-sm font-medium text-gray-600">Links</button>
        </div>
      </div>
      
      <div className="px-4 py-2 border-b border-gray-200 flex items-center">
        <Calendar size={16} className="text-gray-600 mr-2" />
        <span className="text-sm font-medium">March 2025</span>
      </div>
      
      <div className="p-1 grid grid-cols-3 gap-1 flex-grow overflow-y-auto">
        {[...Array(12)].map((_, index) => (
          <div 
            key={index} 
            className="aspect-square bg-gray-200 rounded-sm relative overflow-hidden cursor-pointer"
            onClick={onMediaClick}
          >
            <div className={`w-full h-full bg-blue-${100 + (index % 9) * 100}`}></div>
            {index % 5 === 0 && (
              <div className="absolute bottom-1 right-1 bg-gray-900 bg-opacity-70 rounded text-white text-xs px-1">
                HD
              </div>
            )}
            {index % 7 === 0 && (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <Video size={24} className="text-white" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const MediaViewer = ({ onClose }) => {
  return (
    <div className="w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-xl border border-gray-300 relative">
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10">
        <button 
          className="w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white"
          onClick={onClose}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex">
          <button className="w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white ml-2">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
      
      <div className="h-96 flex items-center justify-center">
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
          <Image size={48} className="text-white opacity-20" />
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white font-medium">Beach Sunset</div>
            <div className="text-gray-300 text-xs">4032 × 3024 • 8.2 MB</div>
          </div>
          <button className="px-3 py-1 bg-white text-black text-xs font-medium rounded-full">
            HD
          </button>
        </div>
      </div>
    </div>
  );
};

const CameraScreen = () => {
  return (
    <div className="h-full flex flex-col relative bg-black">
      <div className="flex-grow flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <Camera size={48} className="text-gray-600" />
      </div>
      
      <div className="px-4 py-6 flex items-center justify-between">
        <button className="w-10 h-10 flex items-center justify-center">
          <Image size={24} className="text-gray-400" />
        </button>
        <button className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white"></div>
        </button>
        <button className="w-10 h-10 flex items-center justify-center">
          <ArrowLeft size={24} className="text-gray-400" />
        </button>
      </div>
      
      <div className="absolute top-4 right-4 flex flex-col">
        <button className="w-10 h-10 rounded-full bg-black bg-opacity-50 flex items-center justify-center text-white mb-3">
          <Upload size={20} />
        </button>
        <button className="w-10 h-10 rounded-full bg-black bg-opacity-50 flex items-center justify-center text-white">
          <Settings size={20} />
        </button>
      </div>
      
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 rounded-full px-3 py-1">
        <div className="flex text-xs text-white font-medium">
          <button className="px-2 py-1 rounded-full bg-white text-black mr-2">HD</button>
          <button className="px-2 py-1">4K</button>
        </div>
      </div>
    </div>
  );
};

const CallsScreen = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold">Calls</h1>
        <Phone size={20} className="text-blue-500" />
      </div>
      
      <div className="overflow-y-auto flex-grow">
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <div className="w-10 h-10 rounded-full bg-green-100 mr-3 flex items-center justify-center text-green-500">
            <Phone size={16} />
          </div>
          <div className="flex-grow">
            <div className="flex justify-between">
              <span className="font-medium">Sarah Parker</span>
              <span className="text-xs text-gray-500 flex items-center">
                <Clock size={12} className="mr-1" />
                12:30 PM
              </span>
            </div>
            <div className="flex items-center">
              <Check size={14} className="text-green-500 mr-1" />
              <span className="text-xs text-gray-600">Outgoing (3m 24s)</span>
            </div>
          </div>
          <button className="ml-2 text-blue-500">
            <Phone size={20} />
          </button>
        </div>
        
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <div className="w-10 h-10 rounded-full bg-red-100 mr-3 flex items-center justify-center text-red-500">
            <Phone size={16} />
          </div>
          <div className="flex-grow">
            <div className="flex justify-between">
              <span className="font-medium">John Smith</span>
              <span className="text-xs text-gray-500 flex items-center">
                <Clock size={12} className="mr-1" />
                Yesterday
              </span>
            </div>
            <div className="flex items-center">
              <X size={14} className="text-red-500 mr-1" />
              <span className="text-xs text-gray-600">Missed</span>
            </div>
          </div>
          <button className="ml-2 text-blue-500">
            <Phone size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsScreen = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-200">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>
      
      <div className="p-4 border-b border-gray-200 flex items-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 mr-4 flex items-center justify-center text-blue-500 font-bold text-xl">
          J
        </div>
        <div>
          <div className="font-bold text-lg">James Peterson</div>
          <div className="text-gray-600">+1 (555) 123-4567</div>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-grow">
        <SettingsItem icon={<User size={20} />} title="Account" />
        <SettingsItem icon={<BellRing size={20} />} title="Notifications" />
        <SettingsItem icon={<Lock size={20} />} title="Privacy" />
        <SettingsItem icon={<Image size={20} />} title="Media Quality" />
        <SettingsItem icon={<Archive size={20} />} title="Storage and Data" />
        <SettingsItem icon={<Shield size={20} />} title="Security" />
        <SettingsItem icon={<Settings size={20} />} title="App Settings" />
      </div>
    </div>
  );
};

const SettingsItem = ({ icon, title }) => {
  return (
    <div className="flex items-center px-4 py-3 border-b border-gray-200">
      <div className="w-8 h-8 rounded-full bg-gray-100 mr-3 flex items-center justify-center text-gray-600">
        {icon}
      </div>
      <span className="font-medium">{title}</span>
    </div>
  );
};

const ComponentShowcase = () => {
  const [qualityLevel, setQualityLevel] = useState(2);
  
  return (
    <div className="w-full max-w-md">
      <h3 className="text-lg font-semibold mb-3">Key Components</h3>
      
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <h4 className="font-medium mb-2">Message Bubbles</h4>
        <div className="mb-3">
          <div className="flex justify-end mb-1">
            <div className="bg-blue-500 text-white rounded-lg rounded-tr-none px-3 py-2 max-w-xs">
              <p>Here's a photo I took yesterday at the beach</p>
            </div>
          </div>
          <div className="flex justify-end mb-1">
            <div className="bg-blue-500 text-white rounded-lg px-3 py-2 max-w-xs">
              <div className="rounded-md overflow-hidden mb-1 bg-blue-400 aspect-video flex items-center justify-center">
                <Image size={24} className="text-white" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Beach_Sunset.jpg</span>
                <span className="text-xs font-medium bg-white text-blue-500 rounded px-1">HD</span>
              </div>
            </div>
          </div>
          <div className="flex justify-start mb-1">
            <div className="bg-gray-200 rounded-lg rounded-tl-none px-3 py-2 max-w-xs">
              <p>Wow, that looks amazing! Can you send it in original quality?</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <h4 className="font-medium mb-2">Resolution Selector</h4>
        <div className="flex justify-between bg-gray-100 rounded-lg p-1 mb-2">
          <button 
            className={`py-1 px-3 rounded-md text-sm font-medium ${qualityLevel === 0 ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            onClick={() => setQualityLevel(0)}
          >
            Low
          </button>
          <button 
            className={`py-1 px-3 rounded-md text-sm font-medium ${qualityLevel === 1 ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            onClick={() => setQualityLevel(1)}
          >
            Standard
          </button>
          <button 
            className={`py-1 px-3 rounded-md text-sm font-medium ${qualityLevel === 2 ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            onClick={() => setQualityLevel(2)}
          >
            HD
          </button>
          <button 
            className={`py-1 px-3 rounded-md text-sm font-medium ${qualityLevel === 3 ? 'bg-white shadow-sm' : 'text-gray-600'}`}
            onClick={() => setQualityLevel(3)}
          >
            Original
          </button>
        </div>
        <div className="text-sm text-gray-500 text-center">
          {qualityLevel === 0 && "Low: Quick loading, minimal data usage (0.3 MB)"}
          {qualityLevel === 1 && "Standard: Good quality for normal viewing (1.2 MB)"}
          {qualityLevel === 2 && "HD: Detailed viewing and zooming (3.7 MB)"}
          {qualityLevel === 3 && "Original: Maximum quality (8.2 MB)"}
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <h4 className="font-medium mb-2">Media Input Bar</h4>
        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
          <button className="text-gray-500 mr-2">
            <Plus size={20} />
          </button>
          <div className="flex-grow bg-white rounded-full px-3 py-1.5">
            <span className="text-gray-400">Message</span>
          </div>
          <button className="text-gray-500 ml-2">
            <Camera size={20} />
          </button>
          <button className="text-gray-500 ml-2">
            <Mic size={20} />
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 shadow">
        <h4 className="font-medium mb-2">Media Quality Indicators</h4>
        <div className="grid grid-cols-4 gap-2">
          <div className="aspect-square bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute bottom-1 right-1 bg-gray-900 bg-opacity-70 rounded text-white text-xs px-1">
              SD
            </div>
          </div>
          <div className="aspect-square bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute bottom-1 right-1 bg-blue-500 bg-opacity-70 rounded text-white text-xs px-1">
              HD
            </div>
          </div>
          <div className="aspect-square bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute bottom-1 right-1 bg-green-500 bg-opacity-70 rounded text-white text-xs px-1">
              4K
            </div>
          </div>
          <div className="aspect-square bg-gray-200 rounded relative overflow-hidden">
            <div className="absolute bottom-1 right-1 bg-purple-500 bg-opacity-70 rounded text-white text-xs px-1">
              RAW
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default AppPreview;
