import React, { useState } from 'react';
import { Phone, Shield, Ambulance, Building2, AlertTriangle } from 'lucide-react';

// Mock data for emergency services
const EMERGENCY_SERVICES = [
  {
    id: 1,
    name: 'Police Department',
    phone: '911',
    address: '123 Main Street',
    response_time: '5-10 minutes',
    icon: Shield
  },
  {
    id: 2,
    name: 'Fire Department',
    phone: '911',
    address: '456 Oak Avenue',
    response_time: '5-8 minutes',
    icon: Building2
  },
  {
    id: 3,
    name: 'Emergency Medical Services',
    phone: '911',
    address: '789 Pine Road',
    response_time: '7-12 minutes',
    icon: Ambulance
  }
];

const EmergencyServices = () => {
  const [selectedService, setSelectedService] = useState(null);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);

  const handleEmergencyCall = () => {
    setShowEmergencyDialog(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 bg-red-600 text-white">
        <h2 className="text-xl font-bold flex items-center">
          <Phone className="mr-2" />
          Emergency Services
        </h2>
      </div>

      {/* Emergency Call Button */}
      <div className="p-6 border-b border-gray-200">
        <button
          onClick={handleEmergencyCall}
          className="w-full bg-red-600 text-white py-4 rounded-lg shadow-lg hover:bg-red-700 transition flex items-center justify-center text-lg font-bold"
        >
          <Phone className="mr-2" />
          Call Emergency Services (911)
        </button>
        <p className="mt-2 text-sm text-gray-500 text-center">
          For immediate assistance in life-threatening situations
        </p>
      </div>

      {/* Services List */}
      <div className="p-6 grid gap-6">
        {EMERGENCY_SERVICES.map(service => {
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              className={`p-4 border rounded-lg transition cursor-pointer ${
                selectedService === service.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
              }`}
              onClick={() => setSelectedService(service.id)}
            >
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-semibold text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Average Response Time: {service.response_time}
                  </p>
                  <div className="mt-2 flex items-center space-x-4">
                    <a
                      href={`tel:${service.phone}`}
                      className="inline-flex items-center text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      <span>{service.phone}</span>
                    </a>
                    <span className="text-gray-500">{service.address}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Tips */}
      <div className="p-6 bg-yellow-50 border-t border-yellow-100">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <div>
            <h3 className="font-semibold text-gray-900">Emergency Safety Tips</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-600">
              <li>• Stay calm and speak clearly when calling emergency services</li>
              <li>• Provide your exact location and any landmarks</li>
              <li>• Follow the dispatcher's instructions carefully</li>
              <li>• Keep your phone line open until help arrives</li>
              <li>• If safe, stay where you are until help reaches you</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Emergency Dialog */}
      {showEmergencyDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Emergency Call Confirmation
              </h3>
              <p className="text-gray-600 mb-6">
                You are about to call emergency services (911). Only proceed if you have a genuine emergency.
              </p>
              <div className="flex space-x-4">
                <a
                  href="tel:911"
                  className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition"
                >
                  Call 911
                </a>
                <button
                  onClick={() => setShowEmergencyDialog(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyServices; 