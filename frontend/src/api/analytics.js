import client from './client';

export const getAnalytics = async () => {
  try {
    const res = await client.get('/analytics');
    return res.data;
  } catch (error) {
    return {
      categoryFrequency: [
        { name: 'Infrastructure', value: 400 },
        { name: 'Sanitation', value: 300 },
        { name: 'Lighting', value: 200 },
        { name: 'Traffic', value: 150 },
      ],
      priorityDistribution: [
        { name: 'Critical', value: 50 },
        { name: 'High', value: 150 },
        { name: 'Medium', value: 400 },
        { name: 'Low', value: 400 },
      ],
      statusBreakdown: [
        { name: 'Open', value: 200 },
        { name: 'In Progress', value: 300 },
        { name: 'Resolved', value: 500 },
      ]
    };
  }
};
