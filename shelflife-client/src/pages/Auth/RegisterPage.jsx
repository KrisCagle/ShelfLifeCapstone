import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../../services/authService";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    address: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await register(formData);
    if (response.ok) {
      navigate("/");
    } else {
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Create Account
        </h1>

        {error && (
          <div className="border border-red-300 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Username</label>
            <input
              type="text"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded border border-gray-300 focus:outline-none focus:border-gray-500"
            />
          </div>
          <button
            type="submit"
            className="border border-gray-300 text-gray-700 font-semibold px-6 py-2 rounded hover:bg-gray-100 transition-colors"
          >
            Create Account
          </button>
        </form>
        <p className="text-gray-500 text-sm mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
