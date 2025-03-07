import React from 'react';
import { MapPin, Bell, FileText, Users, Menu, X } from 'lucide-react';
import SafetyMap from './components/SafetyMap';
import PredictiveAlerts from './components/PredictiveAlerts';
import IncidentForm from './components/IncidentForm';
import CommunityForum from './components/CommunityForum';
import EmergencyServices from './components/EmergencyServices';

const App = () => {
  const [currentPage, setCurrentPage] = React.useState('map');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigation = [
    { id: 'map', name: 'Safety Map', icon: MapPin },
    { id: 'alerts', name: 'Predictive Alerts', icon: Bell },
    { id: 'report', name: 'Report Incident', icon: FileText },
    { id: 'community', name: 'Community Forum', icon: Users },
    { id: 'emergency', name: 'Emergency Services', icon: Bell },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'map':
        return <SafetyMap />;
      case 'alerts':
        return <PredictiveAlerts />;
      case 'report':
        return <IncidentForm />;
      case 'community':
        return <CommunityForum />;
      case 'emergency':
        return <EmergencyServices />;
      default:
        return <SafetyMap />;
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-gray-900/90 border border-gray-800/50 text-gray-300"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`
        fixed left-0 top-0 h-full w-64 bg-[#0a0a0f]/95 border-r border-gray-800/50 backdrop-blur-xl
        transform transition-transform duration-300 ease-in-out z-40
        md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text mb-8">
            SafetyNet
          </h1>
          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`nav-link w-full flex items-center ${
                    currentPage === item.id ? 'active' : ''
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {renderPage()}
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default App; 