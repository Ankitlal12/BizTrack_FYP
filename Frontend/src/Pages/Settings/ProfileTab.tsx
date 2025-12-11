import React from 'react'

type ProfileTabProps = {
  user?: {
    name?: string
    email?: string
    role?: string
  } | null
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user }) => {
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : ''

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-medium text-gray-800 mb-6">
        Profile Information
      </h2>
      <div className="flex items-center mb-8">
        <div className="h-20 w-20 rounded-full bg-teal-500 flex items-center justify-center text-white text-2xl font-bold">
          {initials}
        </div>
        <div className="ml-6">
          <h3 className="text-xl font-medium text-gray-800">{user?.name}</h3>
          <p className="text-gray-500">{user?.email}</p>
          <p className="mt-1 text-sm text-gray-500 capitalize">
            Role: {user?.role}
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg py-2 px-4"
              defaultValue={user?.name}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg py-2 px-4"
              defaultValue={user?.email}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg py-2 px-4"
            placeholder="Enter phone number"
          />
        </div>
        <div className="border-t pt-6">
          <button className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-6 rounded-lg">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileTab

