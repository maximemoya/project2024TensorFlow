import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { Link } from 'react-router-dom';

function LobbyPage() {
  const { user, logout } = useAuth();
  const { serverTime } = useWebSocket();

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-4">Welcome to the Lobby</h2>
                <div className="space-y-2">
                  <p><span className="font-semibold">Name:</span> {user?.name}</p>
                  <p><span className="font-semibold">Email:</span> {user?.email}</p>
                  {serverTime && (
                    <p><span className="font-semibold">Server Time:</span> {formatTime(serverTime.time)}</p>
                  )}
                </div>
                
                <Link 
                  to="/training-sets"
                  className="block w-full bg-blue-500 text-white text-center py-2 px-4 rounded hover:bg-blue-600 transition-colors mt-4"
                >
                  Manage Training Sets
                </Link>
                
                <button
                  onClick={logout}
                  className="mt-4 w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LobbyPage;
