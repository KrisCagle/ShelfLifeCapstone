import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getItems } from "../../services/itemService";
import { isLoggedIn, logout } from "../../services/authService";


const CollectionPage = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        navigate("/login");
        return;
      }
      getItems()
        .then((data) => {
          setItems(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Loading your collection...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Collection</h1>
          <div className="flex gap-3">
            <Link
              to="/items/new"
              className="border border-gray-300 text-gray-700 font-semibold px-4 py-2"
            >
              + Add Item
            </Link>
            <button
              onClick={handleLogout}
              className="border border-gray-300 text-gray-700 font-semibold px-4 py-2"
            >
              Logout
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search your collection..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-6 px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
        />

        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center mt-20">
            Your collection is empty — add your first item!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {filtered.map((item) => (
              <Link to={`/items/${item.id}`} key={item.id} className="flex">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden  transition-all cursor-pointer flex flex-col w-full">
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-sm">No Image</span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-lg font-semibold truncate text-gray-900">
                        {item.title}
                      </h2>
                      <span className="text-xs font-bold px-2 py-1 rounded border border-gray-300 text-gray-600 ml-2 shrink-0">
                        {item.format?.name}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-2">
                      Condition: {item.condition?.name}
                    </p>
                    <p className="text-gray-900 text-sm font-semibold">
                      ${item.purchasePrice?.toFixed(2)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.itemGenres?.map((ig, index) => (
                        <span key={index} className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded">
                          {ig.genre?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;