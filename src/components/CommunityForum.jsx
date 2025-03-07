import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, Flag, Send, User } from 'lucide-react';

// Mock data for forum posts
const MOCK_POSTS = [
  {
    id: 1,
    author: 'JohnDoe',
    title: 'Safety Concerns in Downtown Area',
    content: 'Has anyone else noticed increased suspicious activity around Main Street after dark? We should organize a community watch program.',
    timestamp: '2023-05-15T18:30:00',
    likes: 15,
    comments: [
      {
        id: 1,
        author: 'SafetyCaptain',
        content: 'I agree, I\'ve noticed this too. I\'ve already contacted our local police department about this.',
        timestamp: '2023-05-15T19:15:00',
        likes: 8
      },
      {
        id: 2,
        author: 'ConcernedCitizen',
        content: 'Count me in for the community watch program. We need to take action.',
        timestamp: '2023-05-15T20:00:00',
        likes: 5
      }
    ]
  },
  {
    id: 2,
    author: 'SafetyFirst',
    title: 'New Street Lights Installation',
    content: 'Great news! The city council approved the installation of new LED street lights in our neighborhood. This should help improve visibility and safety.',
    timestamp: '2023-05-14T14:20:00',
    likes: 32,
    comments: [
      {
        id: 3,
        author: 'GreenEnergy',
        content: 'This is excellent! LED lights are also energy-efficient.',
        timestamp: '2023-05-14T15:45:00',
        likes: 12
      }
    ]
  }
];

const CommunityForum = () => {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [newComment, setNewComment] = useState('');
  const [activePost, setActivePost] = useState(null);
  const [filter, setFilter] = useState('recent');

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;

    const post = {
      id: posts.length + 1,
      author: 'CurrentUser',
      title: newPost.title,
      content: newPost.content,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    setPosts([post, ...posts]);
    setNewPost({ title: '', content: '' });
  };

  const handleCreateComment = (postId) => {
    if (!newComment) return;

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [
            ...post.comments,
            {
              id: post.comments.length + 1,
              author: 'CurrentUser',
              content: newComment,
              timestamp: new Date().toISOString(),
              likes: 0
            }
          ]
        };
      }
      return post;
    });

    setPosts(updatedPosts);
    setNewComment('');
  };

  const handleLike = (postId, commentId = null) => {
    const updatedPosts = posts.map(post => {
      if (commentId === null && post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      } else if (post.id === postId) {
        return {
          ...post,
          comments: post.comments.map(comment => 
            comment.id === commentId 
              ? { ...comment, likes: comment.likes + 1 }
              : comment
          )
        };
      }
      return post;
    });

    setPosts(updatedPosts);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (filter === 'recent') {
      return new Date(b.timestamp) - new Date(a.timestamp);
    }
    return b.likes - a.likes;
  });

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 bg-blue-600 text-white">
        <h2 className="text-xl font-bold flex items-center">
          <MessageSquare className="mr-2" />
          Community Forum
        </h2>
      </div>

      {/* Create Post Form */}
      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Post Title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newPost.title}
              onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            />
          </div>
          <div>
            <textarea
              placeholder="Write your post..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            ></textarea>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Post
            </button>
          </div>
        </form>
      </div>

      {/* Filter */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Community Posts</h3>
          <select
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      <div className="divide-y divide-gray-200">
        {sortedPosts.map(post => (
          <div key={post.id} className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{post.title}</h3>
                  <button className="text-gray-500 hover:text-red-500">
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Posted by {post.author} • {formatDate(post.timestamp)}
                </p>
                <p className="mt-2">{post.content}</p>
                
                {/* Post Actions */}
                <div className="mt-3 flex items-center space-x-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{post.likes}</span>
                  </button>
                  <button
                    onClick={() => setActivePost(activePost === post.id ? null : post.id)}
                    className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.comments.length}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {activePost === post.id && (
                  <div className="mt-4 space-y-4">
                    {post.comments.map(comment => (
                      <div key={comment.id} className="pl-4 border-l-2 border-gray-200">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                          </div>
                          <div className="flex-grow">
                            <p className="text-sm text-gray-500">
                              {comment.author} • {formatDate(comment.timestamp)}
                            </p>
                            <p className="mt-1">{comment.content}</p>
                            <button
                              onClick={() => handleLike(post.id, comment.id)}
                              className="mt-2 flex items-center space-x-1 text-gray-500 hover:text-blue-600"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span className="text-sm">{comment.likes}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex items-center space-x-2 mt-4">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button
                        onClick={() => handleCreateComment(post.id)}
                        className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityForum; 