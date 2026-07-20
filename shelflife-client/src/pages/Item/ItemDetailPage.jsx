import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getItemById, deleteItem } from "../../services/itemService";

const priorityLabels = { 1: "Low", 2: "Medium", 3: "High" };

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getItemById(id)
      .then((data) => {
        setItem(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    await deleteItem(id);
    navigate("/");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );

  if (!item)
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Item not found.</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="text-blue-600 hover:underline text-sm mb-4 inline-block"
        >
          ← Back to Collection
        </Link>

        <div className="border border-gray-200 rounded-lg p-6 mt-2">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
            <span className="text-sm font-bold px-3 py-1 rounded border border-gray-300 text-gray-600">
              {item.format?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-500">Condition</p>
              <p className="font-semibold">{item.condition?.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Purchase Price</p>
              <p className="font-semibold">${item.purchasePrice?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Date Acquired</p>
              <p className="font-semibold">
                {new Date(item.dateAcquired).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Store Found</p>
              <p className="font-semibold">{item.storeFound}</p>
            </div>
            <div>
              <p className="text-gray-500">Priority</p>
              <p className="font-semibold">{priorityLabels[item.priority]}</p>
            </div>
          </div>

          {item.notes && (
            <div className="mb-6">
              <p className="text-gray-500 text-sm">Notes</p>
              <p className="mt-1">{item.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-6">
            {item.itemGenres?.map((ig, index) => (
              <span
                key={index}
                className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded"
              >
                {ig.genre?.name}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <Link
              to={`/items/${item.id}/edit`}
              className="border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={() => setShowConfirm(true)}
              className="border border-red-300 text-red-600 font-semibold px-4 py-2 rounded hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-sm w-full mx-4">
              <h2 className="text-xl font-bold mb-2">Delete Item</h2>
              <p className="text-gray-500 mb-6">
                Are you sure you want to remove{" "}
                <span className="text-gray-900 font-semibold">
                  {item.title}
                </span>{" "}
                from your collection?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="border border-red-300 text-red-600 font-semibold px-4 py-2 rounded hover:bg-red-50 transition-colors flex-1"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded hover:bg-gray-100 transition-colors flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetailPage;
