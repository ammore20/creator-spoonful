import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { MessageCircle, Trash2, Edit2, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

interface CommentsSectionProps {
  recipeId: string;
  userId: string | null;
  language: 'en' | 'mr';
}

export const CommentsSection = ({ recipeId, userId, language }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
    subscribeToComments();
  }, [recipeId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('recipe_comments')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    setComments(data || []);
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments-${recipeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipe_comments',
          filter: `recipe_id=eq.${recipeId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newComment.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('recipe_comments')
      .insert({
        recipe_id: recipeId,
        user_id: userId,
        comment: newComment.trim(),
      });

    if (error) {
      toast({
        title: language === 'en' ? 'Error' : 'त्रुटी',
        description: language === 'en' ? 'Failed to post comment' : 'कमेंट पोस्ट करण्यात अयशस्वी',
        variant: 'destructive',
      });
    } else {
      setNewComment('');
      toast({
        description: language === 'en' ? 'Comment posted!' : 'कमेंट पोस्ट झाले!',
      });
    }
    setLoading(false);
  };

  const handleUpdate = async (commentId: string) => {
    if (!editText.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('recipe_comments')
      .update({ comment: editText.trim() })
      .eq('id', commentId);

    if (error) {
      toast({
        title: language === 'en' ? 'Error' : 'त्रुटी',
        description: language === 'en' ? 'Failed to update comment' : 'कमेंट अपडेट करण्यात अयशस्वी',
        variant: 'destructive',
      });
    } else {
      setEditingId(null);
      setEditText('');
      toast({
        description: language === 'en' ? 'Comment updated!' : 'कमेंट अपडेट झाले!',
      });
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm(language === 'en' ? 'Delete this comment?' : 'हे कमेंट हटवायचे?')) return;

    const { error } = await supabase
      .from('recipe_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast({
        title: language === 'en' ? 'Error' : 'त्रुटी',
        description: language === 'en' ? 'Failed to delete comment' : 'कमेंट हटवण्यात अयशस्वी',
        variant: 'destructive',
      });
    } else {
      toast({
        description: language === 'en' ? 'Comment deleted!' : 'कमेंट हटवले!',
      });
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const getUserDisplayName = (comment: Comment) => {
    // Generate a display name from user_id
    const hash = comment.user_id.substring(0, 8);
    return `User ${hash}`;
  };

  return (
    <Card className="mt-8 shadow-card animate-fade-in">
      <CardContent className="p-6">
        <h3 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" />
          {language === 'en' ? 'Comments & Discussion' : 'कमेंट आणि चर्चा'}
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({comments.length})
          </span>
        </h3>

        {/* Add Comment Form */}
        {userId && (
          <form onSubmit={handleSubmit} className="mb-8">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={language === 'en' 
                ? 'Share your experience, tips, or modifications to this recipe...' 
                : 'या रेसिपीसह तुमचा अनुभव, टिप्स किंवा बदल शेअर करा...'}
              className="min-h-[100px] mb-3"
              maxLength={1000}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {newComment.length}/1000
              </span>
              <Button 
                type="submit" 
                disabled={loading || !newComment.trim()}
                className="bg-gradient-hero shadow-warm hover-scale"
              >
                <Send className="mr-2 w-4 h-4" />
                {language === 'en' ? 'Post Comment' : 'कमेंट पोस्ट करा'}
              </Button>
            </div>
          </form>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>
                {language === 'en' 
                  ? 'No comments yet. Be the first to share your thoughts!' 
                  : 'अद्याप कोणतेही कमेंट नाहीत. आपले विचार शेअर करणारे पहिले व्हा!'}
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold">
                    {getUserDisplayName(comment)[0].toUpperCase()}
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground">
                        {getUserDisplayName(comment)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {editingId === comment.id ? (
                      <div>
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="mb-2"
                          maxLength={1000}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(comment.id)}
                            disabled={loading || !editText.trim()}
                          >
                            {language === 'en' ? 'Save' : 'सेव्ह करा'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            {language === 'en' ? 'Cancel' : 'रद्द करा'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-foreground whitespace-pre-wrap break-words">
                        {comment.comment}
                      </p>
                    )}
                  </div>

                  {userId === comment.user_id && editingId !== comment.id && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(comment)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(comment.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
