import { ChefHat, Globe, ShoppingBag, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CreatorCardProps {
  name: string;
  language: 'en' | 'mr';
}

export const CreatorCard = ({ name, language }: CreatorCardProps) => {
  // Creator-specific information (can be expanded to fetch from database in the future)
  const creatorInfo: Record<string, any> = {
    "Sarita's Kitchen": {
      tagline: language === 'en' 
        ? "Known for authentic Maharashtrian dishes made with pure and traditional ingredients."
        : "शुद्ध आणि पारंपारिक घटकांसह बनवलेल्या प्रामाणिक महाराष्ट्रीय पदार्थांसाठी प्रसिद्ध.",
      website: "https://saritaskitchenofficial.com",
      amazonStore: "https://www.amazon.in/s?me=A6FSX0SQK7GV6&marketplaceID=A21TJRUUN4KGV",
      email: "saritaskitchen18@gmail.com"
    }
  };

  const info = creatorInfo[name] || {
    tagline: language === 'en' 
      ? "Passionate about sharing delicious recipes and cooking techniques."
      : "स्वादिष्ट रेसिपी आणि स्वयंपाकाचे तंत्र शेअर करण्यासाठी उत्साही.",
    website: null,
    amazonStore: null,
    email: null
  };

  return (
    <Card className="mb-8 shadow-card hover:shadow-warm transition-all animate-fade-in">
      <CardContent className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="w-16 h-16 border-2 border-primary ring-2 ring-primary/20">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-hero text-primary-foreground text-xl font-bold">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ChefHat className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-xl text-foreground">
                {language === 'en' ? 'Recipe by' : 'रेसिपी'} {name}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {info.tagline}
            </p>
          </div>
        </div>
        
        {/* Links and Contact */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
          {info.website && (
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-primary hover:text-primary-foreground transition-all hover-scale"
              onClick={() => window.open(info.website, '_blank')}
            >
              <Globe className="mr-2 w-4 h-4" />
              {language === 'en' ? 'Website' : 'वेबसाइट'}
            </Button>
          )}
          {info.amazonStore && (
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-primary hover:text-primary-foreground transition-all hover-scale"
              onClick={() => window.open(info.amazonStore, '_blank')}
            >
              <ShoppingBag className="mr-2 w-4 h-4" />
              {language === 'en' ? 'Amazon Store' : 'Amazon Store'}
            </Button>
          )}
          {info.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
              <Mail className="w-4 h-4" />
              <span>{info.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
